/**
 * Market Types
 *
 * Unified market data type definitions.
 */
export interface KlineData {
    symbol: string;
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades: number;
}
export interface StaticDepth {
    lastUpdateId: number;
    asks: Array<[string, string]>;
    bids: Array<[string, string]>;
}
export interface DepthData {
    symbol: string;
    asks: Array<[string, string]>;
    bids: Array<[string, string]>;
}
export interface BookTickerData {
    symbol: string;
    bestBid: number;
    bestBidQty: number;
    bestAsk: number;
    bestAskQty: number;
}
export interface TradeData {
    symbol: string;
    price: number;
    quantity: number;
    tradeTime: number;
    orderType: 'BUY' | 'SELL';
}
export interface FundingData {
    symbol: string;
    nextFundingTime: number;
    rate: number;
    interval?: number;
}
export interface AggTradesData {
    symbol: string;
    id: number;
    price: number;
    quantity: number;
    time: number;
    isBuyer: boolean;
}
export interface GetKlinesParams {
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
}
export interface GetStaticDepthParams {
    symbol: string;
    limit?: number;
}
export interface GetAggTradesParams {
    symbol: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
}
//# sourceMappingURL=market.d.ts.map