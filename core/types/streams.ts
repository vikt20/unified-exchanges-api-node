/**
 * Stream Types
 * 
 * Unified WebSocket stream type definitions.
 */

import { AccountData } from './account.js';
import { OrderData } from './orders.js';

// ━━ WebSocket Handle ━━
export interface HandleWebSocket {
    disconnect: Function;
    id: string;
}

// ━━ Socket Status ━━
export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG';

// ━━ User Data Event ━━
export interface UserData {
    event: 'ACCOUNT_UPDATE' | 'ORDER_TRADE_UPDATE' | 'ALGO_UPDATE' | 'listenKeyExpired';
    accountData: AccountData | undefined;
    orderData: OrderData | undefined;
}
