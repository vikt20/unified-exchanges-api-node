/**
 * Stream Types
 *
 * Unified WebSocket stream type definitions.
 */
import { AccountData } from './account.js';
import { OrderData } from './orders.js';
import { ExchangeInfoUpdate } from './exchange.js';
export interface HandleWebSocket {
    disconnect: Function;
    id: string;
}
export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG' | 'AUTH_FAILED';
export interface FundingStreamOptions {
    /**
     * Fetch the funding interval when the stream cannot provide it.
     * Initialized on the first event and refreshed during minute 00 UTC.
     */
    fetchInterval?: boolean;
}
export interface ExchangeInfoStreamOptions {
    /** REST fallback refresh interval. Defaults to ten minutes. */
    pollingIntervalMs?: number;
}
export type ExchangeInfoStreamCallback = (data: ExchangeInfoUpdate) => void;
export interface UserData {
    event: 'ACCOUNT_UPDATE' | 'ORDER_TRADE_UPDATE' | 'ALGO_UPDATE' | 'listenKeyExpired';
    accountData: AccountData | undefined;
    orderData: OrderData[] | undefined;
    updateType?: 'SNAPSHOT' | 'DELTA';
}
//# sourceMappingURL=streams.d.ts.map