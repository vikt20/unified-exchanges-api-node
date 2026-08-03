import type { AggTradesData, BalanceData, BookTickerData, DepthData, ExtractedInfo, FundingData, FundingHistoryData, KlineData, OrderData, OrderRequestResponse, OrderSide, OrderStatus, OrderType, OrderWorkingType, PositionData, PositionDirection, PositionRiskData, PositionSide, StaticDepth, TimeInForce } from '../core/types.js';
export type BitgetProductType = 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES';
export type BitgetInstType = 'SPOT' | BitgetProductType;
export type BitgetOrderSide = 'buy' | 'sell';
export type BitgetOrderType = 'limit' | 'market';
export type BitgetForce = 'gtc' | 'ioc' | 'fok' | 'post_only';
export type BitgetMarginMode = 'isolated' | 'crossed';
export type BitgetHoldSide = 'long' | 'short';
export type BitgetOrderStatus = 'live' | 'partially_filled' | 'filled' | 'canceled' | 'cancelled';
export type BitgetPlanType = 'normal_plan' | 'track_plan';
export type BitgetTriggerType = 'mark_price' | 'fill_price';
export interface BitgetEnvelope<T> {
    code: string;
    msg?: string;
    message?: string;
    requestTime?: number;
    data?: T;
}
export interface BitgetSpotSymbol {
    symbol: string;
    symbolType?: string;
    baseCoin: string;
    quoteCoin: string;
    minTradeAmount?: string;
    maxTradeAmount?: string;
    pricePrecision: string;
    quantityPrecision: string;
    quotePrecision?: string;
    status: 'online' | 'offline' | 'gray' | 'halt' | string;
    minTradeUSDT?: string;
    orderQuantity?: string;
}
export interface BitgetFuturesContract {
    symbol: string;
    productType?: string;
    isRwa?: 'YES' | 'NO';
    baseCoin: string;
    quoteCoin: string;
    minTradeNum: string;
    priceEndStep?: string;
    volumePlace: string;
    pricePlace: string;
    sizeMultiplier: string;
    minTradeUSDT?: string;
    maxSymbolOrderNum?: string;
    maxMarketOrderQty?: string;
    maxOrderQty?: string;
    symbolStatus: 'normal' | 'maintain' | 'off' | 'limit_open' | string;
    fundInterval?: string;
}
export interface BitgetOrderBook {
    asks: Array<[string | number, string | number]>;
    bids: Array<[string | number, string | number]>;
    ts?: string;
}
export type BitgetCandle = [string, string, string, string, string, string, string];
export interface BitgetTrade {
    symbol?: string;
    tradeId?: string;
    side: string;
    price: string;
    size: string;
    ts: string;
}
export interface BitgetFundingHistoryItem {
    symbol: string;
    fundingRate: string;
    fundingTime: string;
}
export interface BitgetSpotAsset {
    coin: string;
    available: string;
    frozen: string;
    locked: string;
    limitAvailable?: string;
}
export interface BitgetFuturesAccount {
    marginCoin: string;
    locked: string;
    available: string;
    crossedMaxAvailable?: string;
    usdtEquity?: string;
    equity?: string;
}
export interface BitgetPosition {
    symbol: string;
    marginCoin?: string;
    holdSide: BitgetHoldSide | string;
    available?: string;
    locked?: string;
    total: string;
    leverage: string;
    openPriceAvg: string;
    marginMode: BitgetMarginMode | string;
    unrealizedPL: string;
    liquidationPrice?: string;
    markPrice?: string;
    uTime?: string;
}
export interface BitgetPendingOrders {
    entrustedList?: BitgetOrder[];
    endId?: string;
}
export interface BitgetOrder {
    symbol?: string;
    instId?: string;
    size: string;
    orderId: string;
    clientOid?: string;
    baseVolume?: string;
    fee?: string;
    price?: string;
    priceAvg?: string;
    status?: BitgetOrderStatus | string;
    side: BitgetOrderSide | string;
    force?: BitgetForce | string;
    totalProfits?: string;
    posSide?: 'long' | 'short' | 'net' | string;
    reduceOnly?: 'YES' | 'NO' | string;
    orderType?: BitgetOrderType | string;
    orderSource?: string;
    cTime?: string;
    uTime?: string;
}
export interface BitgetPlaceOrderResponse {
    orderId?: string;
    clientOid?: string;
}
export interface BitgetWsArg {
    instType: BitgetInstType;
    channel: string;
    instId?: string;
    coin?: string;
}
export interface BitgetWsEvent {
    event?: string;
    code?: string | number;
    msg?: string;
    arg?: BitgetWsArg;
    action?: 'snapshot' | 'update';
    data?: unknown;
}
export interface BitgetWsDepth {
    asks: Array<[string | number, string | number]>;
    bids: Array<[string | number, string | number]>;
    ts?: string;
}
export interface BitgetWsTicker {
    instId?: string;
    symbol?: string;
    bidPr?: string;
    bidSz?: string;
    askPr?: string;
    askSz?: string;
    lastPr?: string;
    fundingRate?: string;
    nextFundingTime?: string;
    fundingTime?: string;
}
export interface BitgetWsTrade {
    instId?: string;
    price: string;
    size: string;
    side: string;
    ts: string;
}
export interface BitgetWsCandle {
    startTime?: string;
    ts?: string;
    open: string;
    high: string;
    low: string;
    close: string;
    baseVol?: string;
    volume?: string;
}
export interface BitgetWsAccount {
    marginCoin?: string;
    coin?: string;
    available?: string;
    frozen?: string;
    locked?: string;
    equity?: string;
}
export interface BitgetWsPosition {
    instId?: string;
    symbol?: string;
    holdSide?: string;
    total?: string;
    openPriceAvg?: string;
    unrealizedPL?: string;
    liquidationPrice?: string;
    marginMode?: string;
    leverage?: string;
}
export declare const BITGET_SUCCESS_CODE = "00000";
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function asArray<T>(value: unknown, guard: (item: unknown) => item is T): T[];
export declare function toNumber(value: string | undefined, fallback?: number): number;
export declare function decimalStepFromPlaces(places: string | undefined): number;
export declare function normalizeTimeInForce(force: BitgetForce | string | undefined): TimeInForce;
export declare function toBitgetForce(timeInForce?: TimeInForce): BitgetForce;
export declare function toBitgetSide(side: OrderSide): BitgetOrderSide;
export declare function toUnifiedSide(side: string): OrderSide;
export declare function toBitgetOrderType(type: OrderType): BitgetOrderType;
export declare function toUnifiedOrderStatus(status: string | undefined): OrderStatus;
export declare function toUnifiedPositionSide(posSide: string | undefined): PositionSide;
export declare function toPositionDirection(holdSide: string | undefined): PositionDirection;
export declare function mapWorkingType(triggerType?: BitgetTriggerType): OrderWorkingType;
export declare function isBitgetSpotSymbol(value: unknown): value is BitgetSpotSymbol;
export declare function isBitgetFuturesContract(value: unknown): value is BitgetFuturesContract;
export declare function isBitgetOrderBook(value: unknown): value is BitgetOrderBook;
export declare function isBitgetCandle(value: unknown): value is BitgetCandle;
export declare function isBitgetTrade(value: unknown): value is BitgetTrade;
export declare function isBitgetFundingHistoryItem(value: unknown): value is BitgetFundingHistoryItem;
export declare function isBitgetSpotAsset(value: unknown): value is BitgetSpotAsset;
export declare function isBitgetFuturesAccount(value: unknown): value is BitgetFuturesAccount;
export declare function isBitgetPosition(value: unknown): value is BitgetPosition;
export declare function isBitgetOrder(value: unknown): value is BitgetOrder;
export declare function isBitgetPendingOrders(value: unknown): value is BitgetPendingOrders;
export declare function isBitgetPlaceOrderResponse(value: unknown): value is BitgetPlaceOrderResponse;
export declare function isBitgetWsEvent(value: unknown): value is BitgetWsEvent;
export declare function isBitgetWsDepth(value: unknown): value is BitgetWsDepth;
export declare function isBitgetWsTicker(value: unknown): value is BitgetWsTicker;
export declare function isBitgetWsTrade(value: unknown): value is BitgetWsTrade;
export declare function isBitgetWsCandle(value: unknown): value is BitgetWsCandle;
export declare function isBitgetWsAccount(value: unknown): value is BitgetWsAccount;
export declare function isBitgetWsPosition(value: unknown): value is BitgetWsPosition;
export declare function convertSpotExchangeInfo(items: BitgetSpotSymbol[]): {
    [key: string]: ExtractedInfo;
};
export declare function convertFuturesExchangeInfo(items: BitgetFuturesContract[]): {
    [key: string]: ExtractedInfo;
};
export declare function convertDepth(symbol: string, data: BitgetOrderBook): StaticDepth;
export declare function convertWsDepth(symbol: string, data: BitgetWsDepth): DepthData;
export declare function convertCandle(item: BitgetCandle, symbol: string): KlineData;
export declare function convertWsCandle(item: BitgetWsCandle, symbol: string): KlineData;
export declare function convertTrade(item: BitgetTrade, fallbackSymbol: string): AggTradesData;
export declare function convertWsTrade(item: BitgetWsTrade, fallbackSymbol: string): {
    symbol: string;
    price: number;
    quantity: number;
    tradeTime: number;
    orderType: "BUY" | "SELL";
};
export declare function convertFundingHistory(item: BitgetFundingHistoryItem): FundingHistoryData;
export declare function convertSpotAsset(item: BitgetSpotAsset): BalanceData;
export declare function convertFuturesAccount(item: BitgetFuturesAccount): BalanceData;
export declare function convertPositionRisk(item: BitgetPosition): PositionRiskData;
export declare function convertPosition(item: BitgetPosition | BitgetWsPosition): PositionData;
export declare function convertOrder(item: BitgetOrder): OrderData;
export declare function createOrderResponse(input: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity?: number;
    price?: number;
    clientOid: string;
    response: BitgetPlaceOrderResponse;
    reduceOnly?: boolean;
    closePosition?: boolean;
    timeInForce?: TimeInForce;
    stopPrice?: number;
    workingType?: OrderWorkingType;
}): OrderRequestResponse;
export declare function convertTicker(data: BitgetWsTicker, fallbackSymbol: string): BookTickerData | undefined;
export declare function convertBookTickerFromDepth(data: BitgetWsDepth, fallbackSymbol: string): BookTickerData | undefined;
export declare function convertFunding(data: BitgetWsTicker, fallbackSymbol: string): FundingData | undefined;
//# sourceMappingURL=converters.d.ts.map