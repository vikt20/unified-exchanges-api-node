import ws from 'ws';
import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';

type BinanceWsApiWireResponse<T = any> = {
    id?: string | number;
    status?: number;
    result?: T;
    error?: { code?: number; msg?: string; message?: string };
    msg?: string;
};

type PendingWsRequest = {
    timeout: NodeJS.Timeout;
    resolve: (payload: BinanceWsApiWireResponse) => void;
    reject: (error: Error) => void;
};

// Backward-compatible aliases. Prefer core agnostic names:
// - IWebsocketApiClient
// - WebsocketApiOption<IWebsocketApiClient>
export type IBinanceWebsocketApiClient = IWebsocketApiClient;
export type BinanceWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;

export class BinanceWsUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BinanceWsUnavailableError';
    }
}

export type BinanceWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getRecvWindow: () => number;
    getTimestamp: () => number;
    sign: (queryString: string) => string;
    formattedResponse: <T>(object: { data?: T; errors?: string }) => FormattedResponse<T>;
};

export class BinanceWebsocketApiClient implements IWebsocketApiClient {
    private socket: ws | null = null;
    private online = false;
    private destroyed = false;
    private connectingPromise: Promise<void> | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private requestCounter = 1;
    private readonly pending = new Map<string, PendingWsRequest>();
    private readonly reconnectDelayMs = 3000;

    constructor(private readonly config: BinanceWebsocketApiClientConfig) { 
        this.connect();
    }

    async ensureConnected(): Promise<void> {
        if (this.socket === null) await this.connect();
    }

    isOnline(): boolean {
        return this.online && this.socket?.readyState === ws.OPEN;
    }

    async request<T>(method: string, params: Record<string, any>, options?: { timeoutMs?: number }): Promise<FormattedResponse<T>> {
        // await this.connect();

        if (!this.online || !this.socket || this.socket.readyState !== ws.OPEN) {
            throw new BinanceWsUnavailableError('WebSocket API is not connected');
        }

        const timeoutMs = options?.timeoutMs ?? 5000;
        const id = String(this.requestCounter++);
        const payloadParams: Record<string, any> = {
            ...params,
            apiKey: this.config.getApiKey(),
            timestamp: this.config.getTimestamp(),
            recvWindow: this.config.getRecvWindow()
        };

        Object.keys(payloadParams).forEach((key) => payloadParams[key] === undefined && delete payloadParams[key]);

        const queryString = this.buildSignaturePayload(payloadParams);
        const signature = this.config.sign(queryString);
        const payload = {
            id,
            method,
            params: {
                ...payloadParams,
                signature
            }
        };

        return new Promise<FormattedResponse<T>>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Binance WS API request timeout for method ${method}`));
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
                reject(new BinanceWsUnavailableError(error.message || 'Failed to send WS API request'));
            });
        });
    }

    destroy(): void {
        console.log('Destroying Binance WS API client');
        this.destroyed = true;
        this.online = false;
        this.clearReconnectTimer();
        this.clearPendingWithError('WebSocket API client destroyed');
        this.cleanupSocket();
        this.connectingPromise = null;
    }

    private async connect(): Promise<void> {
        if (this.destroyed) {
            throw new BinanceWsUnavailableError('WebSocket API client was destroyed');
        }

        if (this.online && this.socket?.readyState === ws.OPEN) return;
        if (this.connectingPromise) return this.connectingPromise;

        this.connectingPromise = new Promise<void>((resolve, reject) => {
            this.clearReconnectTimer();
            this.cleanupSocket();

            try {
                this.socket = new ws(this.config.getUrl());
            } catch (error: any) {
                this.connectingPromise = null;
                reject(new BinanceWsUnavailableError(error?.message || 'Failed to create WebSocket'));
                this.scheduleReconnect();
                return;
            }

            this.socket.on('open', () => {
                console.log('Binance WS API connected');
                this.online = true;
                this.connectingPromise = null;
                resolve();
            });

            this.socket.on('message', (rawData: any) => {
                let payload: BinanceWsApiWireResponse;
                try {
                    payload = JSON.parse(rawData.toString());
                } catch {
                    return;
                }

                const id = payload.id !== undefined ? String(payload.id) : undefined;
                if (!id) return;

                const request = this.pending.get(id);
                if (!request) return;

                clearTimeout(request.timeout);
                this.pending.delete(id);
                request.resolve(payload);
            });

            this.socket.on('ping', (data: any) => {
                this.socket?.pong(data);
            });

            this.socket.on('close', () => {
                console.log('Binance WS API connection closed');
                this.online = false;
                if (this.connectingPromise) {
                    this.connectingPromise = null;
                    reject(new BinanceWsUnavailableError('WebSocket API connection closed before open'));
                }
                this.clearPendingWithError('WebSocket API connection closed');
                this.scheduleReconnect();
            });

            this.socket.on('error', (error: any) => {
                console.error('Binance WS API connection error:', error);

                this.online = false;
                if (this.connectingPromise) {
                    this.connectingPromise = null;
                    reject(new BinanceWsUnavailableError(error?.message || 'WebSocket API connection error'));
                }
            });
        });

        return this.connectingPromise;
    }

    private parseWsResponse<T>(payload: BinanceWsApiWireResponse<T>): FormattedResponse<T> {
        if (payload.error) {
            const errorMessage = payload.error.msg || payload.error.message || `Binance WS API error (${payload.error.code || 'UNKNOWN'})`;
            console.error('Binance WS API error:', errorMessage);
            return this.config.formattedResponse({ errors: errorMessage });
        }

        if (typeof payload.status === 'number' && payload.status >= 400) {
            console.error('Binance WS API request failed with status:', payload.status);
            return this.config.formattedResponse({ errors: payload.msg || `Binance WS API request failed with status ${payload.status}` });
        }

        // console.log('Binance WS API response received for id', payload.id, ':', payload.result);

        return this.config.formattedResponse({ data: payload.result as T });
    }

    /**
     * Binance WS API requires signed payload keys to be sorted alphabetically.
     */
    private buildSignaturePayload(params: Record<string, any>): string {
        return Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join('&');
    }

    private scheduleReconnect(): void {
        if (this.destroyed || this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, this.reconnectDelayMs);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private clearPendingWithError(reason: string): void {
        for (const [id, request] of this.pending.entries()) {
            clearTimeout(request.timeout);
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
