import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';
export type IBinanceWebsocketApiClient = IWebsocketApiClient;
export type BinanceWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;
export declare class BinanceWsUnavailableError extends Error {
    constructor(message: string);
}
export type BinanceWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getRecvWindow: () => number;
    getTimestamp: () => number;
    sign: (queryString: string) => string;
    formattedResponse: <T>(object: {
        data?: T;
        errors?: string;
    }) => FormattedResponse<T>;
};
export declare class BinanceWebsocketApiClient implements IWebsocketApiClient {
    private readonly config;
    private socket;
    private online;
    private destroyed;
    private connectingPromise;
    private reconnectTimer;
    private requestCounter;
    private readonly pending;
    private readonly reconnectDelayMs;
    constructor(config: BinanceWebsocketApiClientConfig);
    ensureConnected(): Promise<void>;
    isOnline(): boolean;
    request<T>(method: string, params: Record<string, any>, options?: {
        timeoutMs?: number;
    }): Promise<FormattedResponse<T>>;
    destroy(): void;
    private connect;
    private parseWsResponse;
    /**
     * Binance WS API requires signed payload keys to be sorted alphabetically.
     */
    private buildSignaturePayload;
    private scheduleReconnect;
    private clearReconnectTimer;
    private clearPendingWithError;
    private cleanupSocket;
}
//# sourceMappingURL=BinanceWebsocketApi.d.ts.map