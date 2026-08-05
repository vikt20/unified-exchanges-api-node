import ws from 'ws';
import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';

type OkxWsApiDataItem = {
    sCode?: string;
    sMsg?: string;
    [key: string]: any;
};

type OkxWsApiWireResponse<T = OkxWsApiDataItem[]> = {
    id?: string;
    event?: string;
    op?: string;
    code?: string;
    msg?: string;
    data?: T;
};

type PendingWsRequest = {
    timeout: NodeJS.Timeout;
    resolve: (payload: OkxWsApiWireResponse) => void;
    reject: (error: Error) => void;
};

export type IOkxWebsocketApiClient = IWebsocketApiClient;
export type OkxWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;

export class OkxWsUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OkxWsUnavailableError';
    }
}

export type OkxWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getPassphrase: () => string;
    getTimestamp: () => number;
    sign: (payload: string) => string;
    formattedResponse: <T>(object: { data?: T; errors?: string }) => FormattedResponse<T>;
};

/** Authenticated OKX V5 private WebSocket order-entry client. */
export class OkxWebsocketApiClient implements IWebsocketApiClient {
    private socket: ws | null = null;
    private online = false;
    private destroyed = false;
    private connectingPromise: Promise<void> | null = null;
    private rejectConnecting: ((error: Error) => void) | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private requestCounter = 1;
    private readonly pending = new Map<string, PendingWsRequest>();
    private readonly reconnectDelayMs = 3000;
    private readonly pingIntervalMs = 20000;

    constructor(private readonly config: OkxWebsocketApiClientConfig) {
        void this.connect().catch(() => {
            // Availability is reported through ensureConnected().
        });
    }

    async ensureConnected(): Promise<void> {
        if (!this.isOnline()) await this.connect();
    }

    isOnline(): boolean {
        return this.online && this.socket?.readyState === ws.OPEN;
    }

    async request<T>(method: string, params: Record<string, any>, options?: { timeoutMs?: number }): Promise<FormattedResponse<T>> {
        if (!this.isOnline() || !this.socket) {
            throw new OkxWsUnavailableError('WebSocket API is not authenticated');
        }

        const timeoutMs = options?.timeoutMs ?? 5000;
        const id = String(this.requestCounter++);
        const requestParams = { ...params };
        Object.keys(requestParams).forEach((key) => requestParams[key] === undefined && delete requestParams[key]);
        const payload = { id, op: method, args: [requestParams] };

        return new Promise<FormattedResponse<T>>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`OKX WS API request timeout for operation ${method}`));
            }, timeoutMs);

            this.pending.set(id, {
                timeout,
                resolve: (responsePayload) => resolve(this.parseWsResponse<T>(responsePayload)),
                reject
            });

            this.socket!.send(JSON.stringify(payload), (error?: Error) => {
                if (!error) return;
                clearTimeout(timeout);
                this.pending.delete(id);
                reject(new OkxWsUnavailableError(error.message || 'Failed to send WS API request'));
            });
        });
    }

    destroy(): void {
        this.destroyed = true;
        this.online = false;
        this.clearReconnectTimer();
        this.clearPingInterval();
        this.clearPendingWithError('WebSocket API client destroyed');
        this.rejectConnecting?.(new OkxWsUnavailableError('WebSocket API client destroyed'));
        this.cleanupSocket();
        this.connectingPromise = null;
    }

    private async connect(): Promise<void> {
        if (this.destroyed) throw new OkxWsUnavailableError('WebSocket API client was destroyed');
        if (this.isOnline()) return;
        if (this.connectingPromise) return this.connectingPromise;

        this.connectingPromise = new Promise<void>((resolve, reject) => {
            this.clearReconnectTimer();
            this.clearPingInterval();
            this.cleanupSocket();

            let settled = false;
            let authenticationTimeout: NodeJS.Timeout | null = null;
            const rejectConnection = (error: Error) => {
                if (settled) return;
                settled = true;
                if (authenticationTimeout) clearTimeout(authenticationTimeout);
                this.rejectConnecting = null;
                this.connectingPromise = null;
                reject(error);
            };
            this.rejectConnecting = rejectConnection;

            try {
                this.socket = new ws(this.config.getUrl());
            } catch (error: any) {
                rejectConnection(new OkxWsUnavailableError(error?.message || 'Failed to create WebSocket'));
                this.scheduleReconnect();
                return;
            }

            this.socket.on('open', () => {
                const timestamp = Math.floor(this.config.getTimestamp() / 1000).toString();
                const sign = this.config.sign(`${timestamp}GET/users/self/verify`);

                authenticationTimeout = setTimeout(() => {
                    rejectConnection(new OkxWsUnavailableError('WebSocket API authentication timeout'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                }, 5000);

                this.socket?.send(JSON.stringify({
                    op: 'login',
                    args: [{
                        apiKey: this.config.getApiKey(),
                        passphrase: this.config.getPassphrase(),
                        timestamp,
                        sign
                    }]
                }), (error?: Error) => {
                    if (!error) return;
                    rejectConnection(new OkxWsUnavailableError(error.message || 'Failed to authenticate WebSocket API'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                });
            });

            this.socket.on('message', (rawData: any) => {
                const message = rawData.toString();
                if (message === 'pong') return;

                let payload: OkxWsApiWireResponse;
                try {
                    payload = JSON.parse(message);
                } catch {
                    return;
                }

                if (payload.event === 'login' || (payload.event === 'error' && !settled)) {
                    if (payload.code === '0') {
                        this.online = true;
                        this.startPingInterval();
                        if (!settled) {
                            settled = true;
                            if (authenticationTimeout) clearTimeout(authenticationTimeout);
                            this.rejectConnecting = null;
                            this.connectingPromise = null;
                            resolve();
                        }
                    } else {
                        rejectConnection(new OkxWsUnavailableError(payload.msg || `OKX WS API authentication failed (${payload.code ?? 'UNKNOWN'})`));
                        this.cleanupSocket();
                        this.scheduleReconnect();
                    }
                    return;
                }

                const id = payload.id;
                if (!id) return;
                const request = this.pending.get(id);
                if (!request) return;

                clearTimeout(request.timeout);
                this.pending.delete(id);
                request.resolve(payload);
            });

            this.socket.on('ping', (data: any) => this.socket?.pong(data));

            this.socket.on('close', () => {
                this.online = false;
                this.clearPingInterval();
                rejectConnection(new OkxWsUnavailableError('WebSocket API connection closed before authentication'));
                this.clearPendingWithError('WebSocket API connection closed');
                this.scheduleReconnect();
            });

            this.socket.on('error', (error: any) => {
                this.online = false;
                rejectConnection(new OkxWsUnavailableError(error?.message || 'WebSocket API connection error'));
            });
        });

        return this.connectingPromise;
    }

    private parseWsResponse<T>(payload: OkxWsApiWireResponse): FormattedResponse<T> {
        if (payload.code !== undefined && payload.code !== '0') {
            return this.config.formattedResponse({ errors: `${payload.code}: ${payload.msg || 'OKX WS API request failed'}` });
        }

        const data = Array.isArray(payload.data) ? payload.data : [];
        const failedItem = data.find((item: OkxWsApiDataItem) => item.sCode !== undefined && item.sCode !== '0');
        if (failedItem) {
            return this.config.formattedResponse({ errors: `${failedItem.sCode}: ${failedItem.sMsg || 'OKX order request failed'}` });
        }

        return this.config.formattedResponse({ data: data as T });
    }

    private startPingInterval(): void {
        this.clearPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.socket?.readyState === ws.OPEN) this.socket.send('ping');
        }, this.pingIntervalMs);
    }

    private scheduleReconnect(): void {
        if (this.destroyed || this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect().catch(() => {
                // A later reconnect attempt or ensureConnected() will retry.
            });
        }, this.reconnectDelayMs);
    }

    private clearReconnectTimer(): void {
        if (!this.reconnectTimer) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    private clearPingInterval(): void {
        if (!this.pingInterval) return;
        clearInterval(this.pingInterval);
        this.pingInterval = null;
    }

    private clearPendingWithError(reason: string): void {
        for (const [id, request] of this.pending.entries()) {
            clearTimeout(request.timeout);
            // The order may already have reached OKX, so an automatic REST retry
            // would risk submitting the same intent twice.
            request.reject(new Error(reason));
            this.pending.delete(id);
        }
    }

    private cleanupSocket(): void {
        if (!this.socket) return;
        this.socket.removeAllListeners();
        this.socket.terminate();
        this.socket = null;
    }
}
