import { ExtractedInfo, OrderData, OrderStatus, OrderType, PositionData, BookTickerData, FundingData, BalanceData } from '../core/types.js';
export interface KrakenSpotResponse<T> {
    error: string[];
    result: T;
}
export interface KrakenAssetPair {
    altname?: string;
    wsname?: string;
    status?: string;
    base?: string;
    quote?: string;
    pair_decimals?: number;
    lot_decimals?: number;
    ordermin?: string;
    costmin?: string;
    tick_size?: string;
}
export type KrakenAssetPairsResult = Record<string, KrakenAssetPair>;
export type KrakenOrderBookEntry = [string, string, number];
export interface KrakenOrderBook {
    bids: KrakenOrderBookEntry[];
    asks: KrakenOrderBookEntry[];
}
export type KrakenDepthResult = Record<string, KrakenOrderBook>;
export type KrakenOhlcEntry = [number, string, string, string, string, string, string, number];
export type KrakenOHLCResult = {
    last: number;
} & Record<string, KrakenOhlcEntry[] | number>;
export type KrakenTradeEntry = [string, string, number, 'b' | 's', 'l' | 'm', string];
export type KrakenTradesResult = {
    last: string;
} & Record<string, KrakenTradeEntry[] | string>;
export type KrakenBalanceResult = Record<string, string>;
export interface KrakenOrderDescr {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: string;
    price?: string;
    price2?: string;
    leverage?: string;
    order?: string;
    close?: string;
}
export interface KrakenOpenOrder {
    refid?: string | null;
    userref?: number;
    status?: string;
    opentm?: number;
    starttm?: number;
    expiretm?: number;
    descr: KrakenOrderDescr;
    vol: string;
    vol_exec: string;
    cost: string;
    fee: string;
    price: string;
    stopprice?: string;
    limitprice?: string;
    misc?: string;
    oflags?: string;
}
export interface KrakenOpenOrdersResult {
    open: Record<string, KrakenOpenOrder>;
}
export interface KrakenAddOrderResult {
    descr?: {
        order?: string;
        close?: string;
    };
    txid?: string[];
}
export interface KrakenCancelOrderResult {
    count: number;
    pending?: boolean;
}
export interface KrakenSpotWsSubscribeAck {
    method: 'subscribe' | 'unsubscribe';
    success: boolean;
    result?: {
        channel?: string;
        symbol?: string;
        snapshot?: boolean;
    };
    error?: string;
    req_id?: number;
}
export interface KrakenSpotBookLevel {
    price: number;
    qty: number;
}
export interface KrakenSpotBookData {
    symbol: string;
    bids?: KrakenSpotBookLevel[];
    asks?: KrakenSpotBookLevel[];
    checksum?: number;
    timestamp?: string;
}
export interface KrakenSpotBookMessage {
    channel: 'book';
    type: 'snapshot' | 'update';
    data: KrakenSpotBookData[];
}
export interface KrakenSpotTickerData {
    symbol: string;
    bid: number;
    bid_qty: number;
    ask: number;
    ask_qty: number;
    last?: number;
    timestamp?: string;
    volume?: number;
    vwap?: number;
    high?: number;
    low?: number;
    change?: number;
    change_pct?: number;
}
export interface KrakenSpotTickerMessage {
    channel: 'ticker';
    type: 'snapshot' | 'update';
    data: KrakenSpotTickerData[];
}
export interface KrakenSpotTradeData {
    symbol: string;
    side: 'buy' | 'sell';
    qty: number;
    price: number;
    ord_type: 'limit' | 'market';
    trade_id: number;
    timestamp: string;
}
export interface KrakenSpotTradeMessage {
    channel: 'trade';
    type: 'snapshot' | 'update';
    data: KrakenSpotTradeData[];
}
export interface KrakenSpotOhlcData {
    symbol: string;
    interval: number;
    interval_begin: number;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    vwap: number;
    volume: number;
    trades: number;
}
export interface KrakenSpotOhlcMessage {
    channel: 'ohlc';
    type: 'snapshot' | 'update';
    data: KrakenSpotOhlcData[];
}
export interface KrakenFuturesBaseResponse {
    result?: 'success' | 'error' | string;
    error?: string;
}
export interface KrakenFuturesInstrument {
    symbol: string;
    type?: string;
    underlying?: string;
    base?: string;
    quote?: string;
    tickSize?: number;
    contractSize?: number;
    lotSize?: number;
    tradeable?: boolean;
    status?: string;
}
export interface KrakenFuturesInstrumentsResponse extends KrakenFuturesBaseResponse {
    instruments?: KrakenFuturesInstrument[];
    serverTime?: string | number;
}
export type KrakenFuturesOrderBookLevel = [number, number] | {
    price: number;
    qty: number;
};
export interface KrakenFuturesOrderBook {
    bids: KrakenFuturesOrderBookLevel[];
    asks: KrakenFuturesOrderBookLevel[];
}
export interface KrakenFuturesOrderBookResponse extends KrakenFuturesBaseResponse {
    orderBook?: KrakenFuturesOrderBook;
    serverTime?: string | number;
}
export interface KrakenFuturesTicker {
    symbol: string;
    bid?: number;
    ask?: number;
    bid_size?: number;
    ask_size?: number;
    markPrice?: number;
    indexPrice?: number;
    funding_rate?: number;
    funding_rate_predicted?: number;
    next_funding_rate_time?: string | number;
}
export interface KrakenFuturesTickersResponse extends KrakenFuturesBaseResponse {
    tickers?: KrakenFuturesTicker[];
}
export interface KrakenFuturesOpenOrder {
    order_id: string;
    symbol: string;
    side: 'buy' | 'sell';
    orderType: string;
    status: string;
    size: number;
    filledSize?: number;
    limitPrice?: number;
    stopPrice?: number;
    reduceOnly?: boolean;
    timestamp?: number;
}
export interface KrakenFuturesOpenOrdersResponse extends KrakenFuturesBaseResponse {
    openOrders?: KrakenFuturesOpenOrder[];
}
export interface KrakenFuturesOpenPosition {
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entryPrice?: number;
    markPrice?: number;
    unrealizedPnl?: number;
    liquidationPrice?: number;
    leverage?: number;
    marginType?: 'cross' | 'isolated';
}
export interface KrakenFuturesOpenPositionsResponse extends KrakenFuturesBaseResponse {
    openPositions?: KrakenFuturesOpenPosition[];
}
export interface KrakenFuturesAccount {
    type?: string;
    currency?: string;
    balance?: number | string;
    available?: number | string;
    balances?: Record<string, number | string>;
}
export interface KrakenFuturesAccountsResponse extends KrakenFuturesBaseResponse {
    accounts?: Record<string, KrakenFuturesAccount>;
}
export interface KrakenFuturesCandlesResponse extends KrakenFuturesBaseResponse {
    candles?: KrakenFuturesCandle[];
}
export interface KrakenFuturesCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades?: number;
}
export interface KrakenFuturesTradeHistoryResponse extends KrakenFuturesBaseResponse {
    elements?: KrakenFuturesTrade[];
    trades?: KrakenFuturesTrade[];
}
export interface KrakenFuturesTrade {
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    qty: number;
    time: number;
    trade_id?: number;
}
export interface KrakenFuturesBookSnapshotMessage {
    feed: 'book_snapshot';
    product_id: string;
    timestamp: number;
    seq: number;
    tickSize: null;
    bids: KrakenFuturesOrderBookLevel[];
    asks: KrakenFuturesOrderBookLevel[];
}
export interface KrakenFuturesBookDeltaMessage {
    feed: 'book';
    product_id: string;
    side: 'buy' | 'sell';
    seq: number;
    price: number;
    qty: number;
    timestamp: number;
}
export interface KrakenFuturesTradeMessage {
    feed: 'trade';
    product_id: string;
    uid: string;
    side: 'buy' | 'sell';
    type: string;
    seq: number;
    time: number;
    qty: number;
    price: number;
}
export interface KrakenFuturesTradeSnapshotMessage {
    feed: 'trade_snapshot';
    product_id: string;
    trades: KrakenFuturesTradeMessage[];
}
export interface KrakenFuturesTickerMessage {
    feed: 'ticker' | 'ticker_snapshot' | 'ticker_lite' | 'ticker_lite_snapshot';
    product_id: string;
    bid?: number;
    ask?: number;
    bid_size?: number;
    ask_size?: number;
    relative_funding_rate?: number;
    relative_funding_rate_prediction?: number;
    next_funding_rate_time?: string | number;
    timestamp?: number;
}
export interface KrakenFuturesWsOpenOrder {
    instrument: string;
    time: number;
    last_update_time: number;
    qty: number;
    filled: number;
    limit_price?: number;
    stop_price?: number;
    type: string;
    order_id: string;
    cli_ord_id?: string;
    direction: 0 | 1;
    reduce_only: boolean;
    triggerSignal?: string;
    trailing_stop_options?: {
        max_deviation: number;
        unit: 'percent' | 'quote_currency';
    };
}
export interface KrakenFuturesOpenOrdersSnapshotMessage {
    feed: 'open_orders_snapshot' | 'open_orders_verbose_snapshot';
    account: string;
    orders: KrakenFuturesWsOpenOrder[];
    seq?: number;
    timestamp?: number;
}
export interface KrakenFuturesOpenOrdersDeltaMessage {
    feed: 'open_orders';
    order?: KrakenFuturesWsOpenOrder;
    order_id?: string;
    is_cancel?: boolean;
    reason?: string;
    timestamp?: number;
}
export interface KrakenFuturesWsPosition {
    instrument: string;
    balance: number;
    entry_price?: number;
    mark_price?: number;
    index_price?: number;
    pnl?: number;
    liquidation_threshold?: number;
    return_on_equity?: number;
    unrealized_funding?: number;
    effective_leverage?: number;
    initial_margin?: number;
    initial_margin_with_orders?: number;
    maintenance_margin?: number;
    pnl_currency?: string;
}
export interface KrakenFuturesOpenPositionsMessage {
    feed: 'open_positions';
    account: string;
    positions: KrakenFuturesWsPosition[];
    seq?: number;
    timestamp?: number;
}
export interface KrakenFuturesBalanceCurrency {
    quantity?: number;
    value?: number;
    collateral_value?: number;
    available?: number;
}
export interface KrakenFuturesBalanceWallet {
    unit?: string;
    balance?: number;
    available?: number;
}
export interface KrakenFuturesBalancesMessage {
    feed: 'balances' | 'balances_snapshot';
    account: string;
    holding?: Record<string, number>;
    futures?: Record<string, KrakenFuturesBalanceWallet>;
    flex_futures?: {
        balance_value?: number;
        available_margin?: number;
        currencies?: Record<string, KrakenFuturesBalanceCurrency>;
    };
    seq?: number;
    timestamp?: number;
}
export declare function normalizeKrakenAsset(asset?: string): string;
export declare function toSymbolKey(pairKey: string, pair: KrakenAssetPair): string;
export declare function convertKrakenAssetPairsToExtractedInfo(pairs: KrakenAssetPairsResult): {
    [key: string]: ExtractedInfo;
};
export declare function mapKrakenOrderStatus(status?: string): OrderStatus;
export declare function mapKrakenOrderType(orderType: string): OrderType;
export declare function convertKrakenOpenOrder(orderId: string, order: KrakenOpenOrder): OrderData;
export declare function convertKrakenFuturesOrder(order: KrakenFuturesOpenOrder): OrderData;
export declare function convertKrakenFuturesPosition(pos: KrakenFuturesOpenPosition): PositionData;
export declare function mapKrakenFuturesWsOrderType(type: string): OrderType;
export declare function convertKrakenFuturesWsOrder(order: KrakenFuturesWsOpenOrder, isCancel?: boolean, reason?: string): OrderData;
export declare function convertKrakenFuturesWsPosition(position: KrakenFuturesWsPosition): PositionData;
export declare function convertKrakenFuturesWsBalances(message: KrakenFuturesBalancesMessage): BalanceData[];
export declare function toBookTickerFromTicker(message: KrakenFuturesTickerMessage): BookTickerData | undefined;
export declare function toFundingFromTicker(message: KrakenFuturesTickerMessage): FundingData | undefined;
export declare function parseFuturesSymbolParts(symbol: string): {
    base: string;
    quote: string;
};
export declare function mapKrakenFuturesInstrumentToExtractedInfo(instrument: KrakenFuturesInstrument): ExtractedInfo;
export declare function toSpotBookTickerFromTicker(ticker: KrakenSpotTickerData): BookTickerData;
//# sourceMappingURL=converters.d.ts.map