import type { FormattedResponse, IWebsocketApiClient, WebsocketApiOption } from '../core/types.js';
export type IBybitWebsocketApiClient = IWebsocketApiClient;
export type BybitWebsocketApiOption = WebsocketApiOption<IWebsocketApiClient>;
export declare class BybitWsUnavailableError extends Error {
    constructor(message: string);
}
export type BybitWebsocketApiClientConfig = {
    getUrl: () => string;
    getApiKey: () => string;
    getRecvWindow: () => number;
    getTimestamp: () => number;
    sign: (payload: string) => string;
    formattedResponse: <T>(object: {
        data?: T;
        errors?: string;
    }) => FormattedResponse<T>;
};
/**
 * Authenticated Bybit V5 WebSocket order-entry client.
 *
 * The connection is authenticated once. Individual order requests then carry
 * only Bybit's timestamp/receive-window header and one request object in args.
 */
export declare class BybitWebsocketApiClient implements IWebsocketApiClient {
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
    constructor(config: BybitWebsocketApiClientConfig);
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
//# sourceMappingURL=BybitWebsocketApi.d.ts.map