/**
 * Connection option types shared by ExchangeFactory and clients.
 */
import type { FormattedResponse } from './response.js';
export type WebsocketApiFactory<T = unknown> = () => T;
export type WebsocketApiOption<T = unknown> = boolean | T | WebsocketApiFactory<T>;
export interface IWebsocketApiClient {
    ensureConnected(): Promise<void>;
    isOnline(): boolean;
    request<T>(method: string, params: Record<string, any>, options?: {
        timeoutMs?: number;
    }): Promise<FormattedResponse<T>>;
    destroy(): void;
}
export interface ExchangeConnectionOptions {
    useWebsocketApi?: WebsocketApiOption<IWebsocketApiClient>;
}
//# sourceMappingURL=connection.d.ts.map