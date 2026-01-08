import { KlineData, OrderData, PositionData, ExchangeInfoData, OrderWorkingType } from '../core/types.js';
export interface BybitWsMessage {
    topic?: string;
    op?: string;
    type?: 'snapshot' | 'delta';
    ts?: number;
    data?: any;
    success?: boolean;
    ret_msg?: string;
    conn_id?: string;
    req_id?: string;
}
export type BybitTriggerBy = 'LastPrice' | 'IndexPrice' | 'MarkPrice';
export type BybitOrderStatus = 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected' | 'Untriggered' | 'Triggered' | 'Deactivated' | 'Created';
export type BybitSide = 'Buy' | 'Sell';
export type BybitOrderType = 'Market' | 'Limit';
export type BybitTimeInForce = 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
export type BybitCategory = 'spot' | 'linear' | 'inverse' | 'option';
export interface BybitOrderWsData {
    category: BybitCategory;
    symbol: string;
    orderId: string;
    orderLinkId: string;
    side: BybitSide;
    orderType: BybitOrderType;
    cancelType: string;
    price: string;
    qty: string;
    orderStatus: BybitOrderStatus;
    orderIv: string;
    triggerPrice: string;
    triggerDirection: number;
    triggerBy: BybitTriggerBy;
    tips: string;
    lastExecIv: string;
    lastExecPrice: string;
    lastExecQty: string;
    cumExecQty: string;
    cumExecValue: string;
    cumExecFee: string;
    avgPrice: string;
    leavesQty: string;
    leavesValue: string;
    cumExecIv: string;
    jv: string;
    rejectReason: string;
    orderIM: string;
    isLeverage: string;
    positionIdx: 0 | 1 | 2;
    timeInForce: BybitTimeInForce;
    leavesPric: string;
    reduceOnly: boolean;
    closeOnTrigger: boolean;
    createdTime: string;
    updatedTime: string;
    tpslMode: string;
    tpTriggerBy: string;
    slTriggerBy: string;
    tpLimitPrice: string;
    slLimitPrice: string;
    smpType: string;
    smpGroup: number;
    smpOrderId: string;
    slFormat: string;
    tpFormat: string;
}
export interface BybitPositionWsData {
    category: string;
    symbol: string;
    side: BybitSide;
    size: string;
    positionIdx: 0 | 1 | 2;
    tradeMode: number;
    positionValue: string;
    riskId: number;
    riskLimitValue: string;
    entryPrice: string;
    markPrice: string;
    leverage: string;
    positionBalance: string;
    autoAddMargin: number;
    liqPrice: string;
    bustPrice: string;
    tpSlMode: string;
    takeProfit: string;
    stopLoss: string;
    trailingStop: string;
    unrealisedPnl: string;
    cumRealisedPnl: string;
    positionStatus: string;
    adlRankIndicator: number;
    createdTime: string;
    updatedTime: string;
    avgPrice: string;
}
export interface BybitWalletCoinData {
    coin: string;
    equity: string;
    usdValue: string;
    walletBalance: string;
    availableToWithdraw: string;
    availableToBorrow: string;
    borrowAmount: string;
    accruedInterest: string;
    totalOrderIM: string;
    totalPositionIM: string;
    totalPositionMM: string;
    unrealisedPnl: string;
    cumRealisedPnl: string;
}
export interface BybitWalletWsData {
    accountIMRate: string;
    accountMMRate: string;
    totalEquity: string;
    totalWalletBalance: string;
    totalMarginBalance: string;
    totalAvailableBalance: string;
    accountLTV: string;
    accountType: string;
    coin: BybitWalletCoinData[];
}
export declare function convertExchangeInfo(data: any): ExchangeInfoData;
export interface BybitParams {
    category: 'spot' | 'linear' | 'inverse' | 'option';
    [key: string]: any;
}
export declare function convertObjectIntoUrlEncoded(obj: any): string;
export interface BybitDepthWsData {
    s: string;
    b: [string, string][];
    a: [string, string][];
    u: number;
    seq: number;
}
export interface BybitKlineWsData {
    start: number;
    end: number;
    interval: string;
    open: string;
    close: string;
    high: string;
    low: string;
    volume: string;
    turnover: string;
    confirm: boolean;
    timestamp: number;
}
export interface BybitBookTickerWsData {
    symbol: string;
    bid1Price: string;
    bid1Size: string;
    ask1Price: string;
    ask1Size: string;
}
export interface BybitTickerWsData {
    symbol: string;
    bid1Price: string;
    bid1Size: string;
    ask1Price: string;
    ask1Size: string;
    lastPrice: string;
    fundingRate: string;
    nextFundingTime: string;
    fundingIntervalHour: string;
}
export declare function convertBybitFunding(item: BybitTickerWsData): import('../core/types.js').FundingData;
export interface BybitTradeWsData {
    T: number;
    s: string;
    S: BybitSide;
    v: string;
    p: string;
    L: string;
    i: string;
    BT: boolean;
}
export declare function mapBybitTriggerBy(triggerBy: string): OrderWorkingType;
export declare function convertBybitKline(item: string[], symbol: string): KlineData;
export declare function convertBybitOrder(item: any): OrderData;
export declare function convertBybitPosition(item: any): PositionData;
//# sourceMappingURL=converters.d.ts.map