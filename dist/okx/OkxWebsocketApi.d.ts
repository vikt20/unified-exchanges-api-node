import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';
export type IOkxWebsocketApiClient = IWebsocketApiClient;
export type OkxWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;
export declare class OkxWsUnavailableError extends Error {
    constructor(message: string);
}
export type OkxWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getPassphrase: () => string;
    getTimestamp: () => number;
    sign: (payload: string) => string;
    formattedResponse: <T>(object: {
        data?: T;
        errors?: string;
    }) => FormattedResponse<T>;
};
/** Authenticated OKX V5 private WebSocket order-entry client. */
export declare class OkxWebsocketApiClient implements IWebsocketApiClient {
    private readonly config;
    private socket;
    private online;
    private destroyed;
    private connectingPromise;
    private rejectConnecting;
    private reconnectTimer;
    private pingInterval;
    private requestCounter;
    private readonly pending;
    private readonly reconnectDelayMs;
    private readonly pingIntervalMs;
    constructor(config: OkxWebsocketApiClientConfig);
    ensureConnected(): Promise<void>;
    isOnline(): boolean;
    request<T>(method: string, params: Record<string, any>, options?: {
        timeoutMs?: number;
    }): Promise<FormattedResponse<T>>;
    destroy(): void;
    private connect;
    private parseWsResponse;
    private startPingInterval;
    private scheduleReconnect;
    private clearReconnectTimer;
    private clearPingInterval;
    private clearPendingWithError;
    private cleanupSocket;
}
//# sourceMappingURL=OkxWebsocketApi.d.ts.map