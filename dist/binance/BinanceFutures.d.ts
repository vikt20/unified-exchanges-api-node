import BinanceStreams, { KlineData } from './BinanceStreams.js';
import { FormattedResponse, GetStaticDepthParams, StaticDepth, AccountData, OrderData, OrderRequestResponse, OrderSide, OrderType, TimeInForce, OrderWorkingType, GetOpenOrdersBySymbolParams, CancelAllOpenOrdersParams, CancelOrderByIdParams, MarketOrderParams, TrailingStopOrderParams, LimitOrderParams, PositionData, StopOrderParams, ReduceOrderParams, ReducePositionParams, ExtractedInfo, GetAggTradesParams, AggTradesData, StopMarketOrderParams } from './BinanceBase.js';
import type { PositionRiskData } from '../core/types.js';
import { IExchangeClient } from '../core/IExchangeClient.js';
type OrderInput = {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity?: number;
    price?: number;
    triggerPrice?: number;
    timeInForce?: TimeInForce;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;
    workingType?: OrderWorkingType;
    callbackRate?: number;
    activatePrice?: number;
    algoType?: 'CONDITIONAL';
};
export type PositionDataByRequest = {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    breakEvenPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    maxNotionalValue: string;
    marginType: string;
    isolatedMargin: string;
    isAutoAddMargin: string;
    positionSide: string;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
    isolated: boolean;
    adlQuantile: number;
};
export type KlineDataByRequest = [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string
];
/**
 * {
  "e": "aggTrade",  // Event type
  "E": 123456789,   // Event time
  "s": "BTCUSDT",    // Symbol
  "a": 5933014,		// Aggregate trade ID
  "p": "0.001",     // Price
  "q": "100",       // Quantity
  "f": 100,         // First trade ID
  "l": 105,         // Last trade ID
  "T": 123456785,   // Trade time
  "m": true,        // Is the buyer the market maker?
}
 */
export type AggTradesDataByRequest = {
    "a": number;
    "p": string;
    "q": string;
    "f": number;
    "l": number;
    "T": number;
    "m": boolean;
};
/**
 * {"buySellRatio":"0.9083","sellVol":"409833397.0000","buyVol":"372257351.0000","timestamp":1764875700000}
 */
export type LongShortRatioDataByRequest = {
    "buySellRatio": string;
    "sellVol": string;
    "buyVol": string;
    "timestamp": number;
};
export default class BinanceFutures extends BinanceStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean, pingServer?: boolean);
    closeListenKey(): Promise<FormattedResponse<any>>;
    getExchangeInfo(): Promise<FormattedResponse<{
        [key: string]: ExtractedInfo;
    }>>;
    getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>>;
    getKlines(params: {
        symbol: string;
        interval: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<FormattedResponse<KlineData[]>>;
    getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>>;
    getLongShortRatio(params: {
        symbol: string;
        limit?: number;
        period?: string;
        startTime?: number;
        endTime?: number;
    }): Promise<FormattedResponse<LongShortRatioDataByRequest[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<any>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<any>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceStopOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>>;
}
export {};
//# sourceMappingURL=BinanceFutures.d.ts.map