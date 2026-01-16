/**
 * Exchange Types
 *
 * Unified exchange information type definitions.
 */
import { OrderType } from './common.js';
export type FilterType = 'PRICE_FILTER' | 'LOT_SIZE' | 'MIN_NOTIONAL' | 'NOTIONAL' | 'MARKET_LOT_SIZE' | 'MAX_NUM_ORDERS' | 'MAX_NUM_ALGO_ORDERS' | 'PERCENT_PRICE';
export interface SymbolFilter {
    filterType: string;
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
    [key: string]: unknown;
}
export interface SymbolInfo {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision?: number;
    quoteAssetPrecision?: number;
    orderTypes?: (OrderType | string)[];
    filters?: SymbolFilter[];
    [key: string]: unknown;
}
export interface ExchangeInfoData {
    symbols: SymbolInfo[];
    serverTime?: number;
    timezone?: string;
    [key: string]: unknown;
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
//# sourceMappingURL=exchange.d.ts.map