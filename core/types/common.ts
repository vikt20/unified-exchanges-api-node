/**
 * Core Enums & Primitives
 * 
 * These are the unified type definitions used across all exchanges.
 * Binance naming conventions are the standard.
 */

// ━━ Market Type ━━
export type MarketType = 'futures' | 'spot';

// ━━ Order Enums ━━
export type OrderSide = 'BUY' | 'SELL';

export type OrderType =
    | 'LIMIT'
    | 'MARKET'
    | 'STOP'
    | 'TAKE_PROFIT'
    | 'STOP_MARKET'
    | 'TAKE_PROFIT_MARKET'
    | 'LIMIT_MAKER'
    | 'TRAILING_STOP_MARKET'
    | 'STOP_LOSS_LIMIT'
    | 'TAKE_PROFIT_LIMIT';

export type OrderStatus =
    | 'NEW'
    | 'PARTIALLY_FILLED'
    | 'FILLED'
    | 'CANCELED'
    | 'PENDING_CANCEL'
    | 'REJECTED'
    | 'EXPIRED'
    | 'PENDING'
    | 'TRIGGERED'
    | 'FINISHED';

export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

export type OrderWorkingType = 'CONTRACT_PRICE' | 'MARK_PRICE';

// ━━ Position Enums ━━
export type PositionDirection = 'LONG' | 'SHORT';

export type PositionSide = 'BOTH' | 'LONG' | 'SHORT';
