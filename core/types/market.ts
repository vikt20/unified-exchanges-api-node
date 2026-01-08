/**
 * Market Types
 * 
 * Unified market data type definitions.
 */

// ━━ Kline/Candlestick Data ━━
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

// ━━ Order Book / Depth ━━
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

// ━━ Ticker Data ━━
export interface BookTickerData {
    symbol: string;
    bestBid: number;
    bestBidQty: number;
    bestAsk: number;
    bestAskQty: number;
}

// ━━ Trade Data ━━
export interface TradeData {
    symbol: string;
    price: number;
    quantity: number;
    tradeTime: number;
    orderType: 'BUY' | 'SELL';
}

// ━━ Funding Data ━━
export interface FundingData {
    symbol: string;
    nextFundingTime: number;
    rate: number;
    interval?: number;
}

// ━━ Aggregated Trades ━━
export interface AggTradesData {
    symbol: string;
    id: number;
    price: number;
    quantity: number;
    time: number;
    isBuyer: boolean;
}

// ━━ Kline Request Params ━━
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
