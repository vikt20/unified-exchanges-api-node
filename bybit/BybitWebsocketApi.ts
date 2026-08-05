import ws from 'ws';
import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';

type BybitWsApiWireResponse<T = any> = {
    reqId?: string;
    retCode?: number;
    retMsg?: string;
    op?: string;
    data?: T;
};

type PendingWsRequest = {
    timeout: NodeJS.Timeout;
    resolve: (payload: BybitWsApiWireResponse) => void;
    reject: (error: Error) => void;
};

export type IBybitWebsocketApiClient = IWebsocketApiClient;
export type BybitWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;

export class BybitWsUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BybitWsUnavailableError';
    }
}

export type BybitWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getRecvWindow: () => number;
    getTimestamp: () => number;
    sign: (payload: string) => string;
    formattedResponse: <T>(object: { data?: T; errors?: string }) => FormattedResponse<T>;
};

/**
 * Authenticated Bybit V5 WebSocket order-entry client.
 *
 * The connection is authenticated once. Individual order requests then carry
 * only Bybit's timestamp/receive-window header and one request object in args.
 */
export class BybitWebsocketApiClient implements IWebsocketApiClient {
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

    constructor(private readonly config: BybitWebsocketApiClientConfig) {
        void this.connect().catch(() => {
            // The caller observes availability through ensureConnected().
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
            throw new BybitWsUnavailableError('WebSocket API is not authenticated');
        }

        const timeoutMs = options?.timeoutMs ?? 5000;
        const reqId = String(this.requestCounter++);
        const requestParams = { ...params };
        Object.keys(requestParams).forEach((key) => requestParams[key] === undefined && delete requestParams[key]);

        const payload = {
            reqId,
            header: {
                'X-BAPI-TIMESTAMP': String(this.config.getTimestamp()),
                'X-BAPI-RECV-WINDOW': String(this.config.getRecvWindow())
            },
            op: method,
            args: [requestParams]
        };

        return new Promise<FormattedResponse<T>>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(reqId);
                reject(new Error(`Bybit WS API request timeout for method ${method}`));
            }, timeoutMs);

            this.pending.set(reqId, {
                timeout,
                resolve: (responsePayload) => resolve(this.parseWsResponse<T>(responsePayload)),
                reject
            });

            this.socket!.send(JSON.stringify(payload), (error?: Error) => {
                if (!error) return;
                clearTimeout(timeout);
                this.pending.delete(reqId);
                reject(new BybitWsUnavailableError(error.message || 'Failed to send WS API request'));
            });
        });
    }

    destroy(): void {
        this.destroyed = true;
        this.online = false;
        this.clearReconnectTimer();
        this.clearPingInterval();
        this.clearPendingWithError('WebSocket API client destroyed');
        this.rejectConnecting?.(new BybitWsUnavailableError('WebSocket API client destroyed'));
        this.cleanupSocket();
        this.connectingPromise = null;
    }

    private async connect(): Promise<void> {
        if (this.destroyed) {
            throw new BybitWsUnavailableError('WebSocket API client was destroyed');
        }

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
                rejectConnection(new BybitWsUnavailableError(error?.message || 'Failed to create WebSocket'));
                this.scheduleReconnect();
                return;
            }

            this.socket.on('open', () => {
                const expires = this.config.getTimestamp() + 10000;
                const signature = this.config.sign(`GET/realtime${expires}`);
                authenticationTimeout = setTimeout(() => {
                    rejectConnection(new BybitWsUnavailableError('WebSocket API authentication timeout'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                }, 5000);
                this.socket?.send(JSON.stringify({
                    op: 'auth',
                    args: [this.config.getApiKey(), expires, signature]
                }), (error?: Error) => {
                    if (!error) return;
                    rejectConnection(new BybitWsUnavailableError(error.message || 'Failed to authenticate WebSocket API'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                });
            });

            this.socket.on('message', (rawData: any) => {
                let payload: BybitWsApiWireResponse;
                try {
                    payload = JSON.parse(rawData.toString());
                } catch {
                    return;
                }

                if (payload.op === 'auth') {
                    if (payload.retCode === 0 || payload.retCode === 20001) {
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
                        const message = payload.retMsg || `Bybit WS API authentication failed (${payload.retCode ?? 'UNKNOWN'})`;
                        rejectConnection(new BybitWsUnavailableError(message));
                        this.cleanupSocket();
                        this.scheduleReconnect();
                    }
                    return;
                }

                if (payload.op === 'pong') return;

                const reqId = payload.reqId;
                if (!reqId) return;

                const request = this.pending.get(reqId);
                if (!request) return;

                clearTimeout(request.timeout);
                this.pending.delete(reqId);
                request.resolve(payload);
            });

            this.socket.on('ping', (data: any) => {
                this.socket?.pong(data);
            });

            this.socket.on('close', () => {
                this.online = false;
                this.clearPingInterval();
                rejectConnection(new BybitWsUnavailableError('WebSocket API connection closed before authentication'));
                this.clearPendingWithError('WebSocket API connection closed');
                this.scheduleReconnect();
            });

            this.socket.on('error', (error: any) => {
                this.online = false;
                rejectConnection(new BybitWsUnavailableError(error?.message || 'WebSocket API connection error'));
            });
        });

        return this.connectingPromise;
    }

    private parseWsResponse<T>(payload: BybitWsApiWireResponse<T>): FormattedResponse<T> {
        if (payload.retCode !== undefined && payload.retCode !== 0) {
            const errorMessage = payload.retMsg || `Bybit WS API error (${payload.retCode})`;
            return this.config.formattedResponse({ errors: `${payload.retCode}: ${errorMessage}` });
        }

        return this.config.formattedResponse({ data: payload.data as T });
    }

    private startPingInterval(): void {
        this.clearPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.socket?.readyState === ws.OPEN) {
                this.socket.send(JSON.stringify({ op: 'ping' }));
            }
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
        for (const [reqId, request] of this.pending.entries()) {
            clearTimeout(request.timeout);
            // The server may already have accepted an in-flight order. Do not
            // classify this ambiguous state as safe for an automatic REST retry.
            request.reject(new Error(reason));
            this.pending.delete(reqId);
        }
    }

    private cleanupSocket(): void {
        if (!this.socket) return;
        this.socket.removeAllListeners();
        this.socket.terminate();
        this.socket = null;
    }
}
