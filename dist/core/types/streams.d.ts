/**
 * Stream Types
 *
 * Unified WebSocket stream type definitions.
 */
import { AccountData } from './account.js';
import { OrderData } from './orders.js';
export interface HandleWebSocket {
    disconnect: Function;
    id: string;
}
export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG';
export interface UserData {
    event: 'ACCOUNT_UPDATE' | 'ORDER_TRADE_UPDATE' | 'ALGO_UPDATE' | 'listenKeyExpired';
    accountData: AccountData | undefined;
    orderData: OrderData | undefined;
}
//# sourceMappingURL=streams.d.ts.map