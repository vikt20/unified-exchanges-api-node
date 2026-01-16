/**
 * Exchange Types
 * 
 * Unified exchange information type definitions.
 */

import { OrderType } from './common.js';

// ━━ Common Filter Types ━━
export type FilterType =
    | 'PRICE_FILTER'
    | 'LOT_SIZE'
    | 'MIN_NOTIONAL'
    | 'NOTIONAL'
    | 'MARKET_LOT_SIZE'
    | 'MAX_NUM_ORDERS'
    | 'MAX_NUM_ALGO_ORDERS'
    | 'PERCENT_PRICE';

// ━━ Symbol Filter (Flexible for different exchanges) ━━
export interface SymbolFilter {
    filterType: string;  // Using string for broader compatibility
    minPrice?: string;
    maxPrice?: string;
    tickSize?: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
    minNotional?: string;
    notional?: string | number;
    limit?: number;
    multiplierUp?: string;
    multiplierDown?: string;
    [key: string]: unknown;  // Allow additional exchange-specific properties
}

// ━━ Symbol Info ━━
export interface SymbolInfo {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision?: number;
    quoteAssetPrecision?: number;
    orderTypes?: (OrderType | string)[];
    filters?: SymbolFilter[];
    [key: string]: unknown;  // Allow additional exchange-specific properties
}

// ━━ Exchange Info ━━
export interface ExchangeInfoData {
    symbols: SymbolInfo[];
    serverTime?: number;
    timezone?: string;
    [key: string]: unknown;  // Allow additional exchange-specific properties
}

export type ExtractedInfo = {
    symbol: string;
    status: string;
    minPrice: number;
    maxPrice: number;
    tickSize: number;
    stepSize: number;
    minQty: number;
    maxQty: number;
    minNotional: number;
    orderTypes: Array<'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'>;
    baseAsset: string;
    quoteAsset: string;
};

// ━━ Extracted/Processed Symbol Info (Normalized data) ━━
export interface ProcessedSymbolInfo {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    minPrice: number;
    maxPrice: number;
    tickSize: number;
    stepSize: number;
    minQty: number;
    maxQty: number;
    minNotional: number;
    orderTypes: string[];
}
