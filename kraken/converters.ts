import {
    ExtractedInfo,
    OrderData,
    OrderStatus,
    OrderSide,
    OrderType,
    TimeInForce,
    PositionDirection,
    PositionData,
    OrderWorkingType,
    BookTickerData,
    FundingData,
    BalanceData
} from '../core/types.js';

// --- Kraken Spot REST Types ---

export interface KrakenSpotResponse<T> {
    error: string[];
    result: T;
}

export interface KrakenAssetPair {
    altname?: string;
    wsname?: string;
    status?: string;
    aclass_base?: string;
    aclass_quote?: string;
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

export type KrakenOHLCResult = { last: number } & Record<string, KrakenOhlcEntry[] | number>;

export type KrakenTradeEntry = [string, string, number, 'b' | 's', 'l' | 'm', string];

export type KrakenTradesResult = { last: string } & Record<string, KrakenTradeEntry[] | string>;

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

// --- Kraken Spot WS v2 Types ---

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

// --- Kraken Futures REST Types ---

export interface KrakenFuturesBaseResponse {
    result?: 'success' | 'error' | string;
    error?: string;
}

export interface KrakenFuturesInstrument {
    symbol: string;
    type?: string;
    tradfi?: boolean;
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

export type KrakenFuturesOrderBookLevel = [number, number] | { price: number; qty: number };

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

// --- Kraken Futures WS Types ---

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

// --- Helpers ---

export function normalizeKrakenAsset(asset?: string): string {
    if (!asset) return '';
    let normalized = asset;
    if ((asset.startsWith('X') || asset.startsWith('Z')) && asset.length > 3) {
        normalized = asset.slice(1);
    }
    if (normalized === 'XBT') return 'BTC';
    if (normalized === 'XDG') return 'DOGE';
    return normalized;
}

export function toSymbolKey(pairKey: string, pair: KrakenAssetPair): string {
    if (pair.altname && pair.altname.length > 0) return pair.altname;
    if (pair.wsname) return pair.wsname.replace('/', '');
    return pairKey;
}

export function convertKrakenAssetPairsToExtractedInfo(pairs: KrakenAssetPairsResult): { [key: string]: ExtractedInfo } {
    const info: { [key: string]: ExtractedInfo } = {};
    for (const [pairKey, pair] of Object.entries(pairs)) {
        if (pair.status && pair.status !== 'online' && pair.status !== 'online,live' && pair.status !== 'online,maintenance') {
            continue;
        }
        const symbol = toSymbolKey(pairKey, pair);
        const base = normalizeKrakenAsset(pair.base);
        const quote = normalizeKrakenAsset(pair.quote);
        const lotDecimals = pair.lot_decimals ?? 0;
        const stepSize = lotDecimals > 0 ? 1 / Math.pow(10, lotDecimals) : 1;
        const tickSize = pair.tick_size ? parseFloat(pair.tick_size) : 0;
        const minQty = pair.ordermin ? parseFloat(pair.ordermin) : 0;
        const minNotional = pair.costmin ? parseFloat(pair.costmin) : 0;

        info[symbol] = {
            symbol,
            status: pair.status ? (pair.status.startsWith('online') ? 'TRADING' : 'BREAK') : 'TRADING',
            type: pair.aclass_base === 'tokenized_asset' || pair.aclass_quote === 'tokenized_asset' ? 'STOCK' : 'COIN',
            minPrice: 0,
            maxPrice: 0,
            tickSize: tickSize,
            stepSize: stepSize,
            minQty: minQty,
            maxQty: 0,
            minNotional: minNotional,
            orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'],
            baseAsset: base,
            quoteAsset: quote
        };
    }
    return info;
}

export function mapKrakenOrderStatus(status?: string): OrderStatus {
    switch (status) {
        case 'open':
            return 'NEW';
        case 'closed':
            return 'FILLED';
        case 'canceled':
        case 'cancelled':
            return 'CANCELED';
        case 'expired':
            return 'EXPIRED';
        case 'pending':
            return 'PENDING';
        default:
            return 'NEW';
    }
}

export function mapKrakenOrderType(orderType: string): OrderType {
    switch (orderType) {
        case 'limit':
            return 'LIMIT';
        case 'market':
            return 'MARKET';
        case 'stop-loss':
            return 'STOP';
        case 'take-profit':
            return 'TAKE_PROFIT';
        case 'STOP':
            return 'STOP_LOSS_LIMIT';
        case 'take-profit-limit':
            return 'TAKE_PROFIT_LIMIT';
        case 'trailing-stop':
            return 'TRAILING_STOP_MARKET';
        default:
            return 'LIMIT';
    }
}

export function convertKrakenOpenOrder(orderId: string, order: KrakenOpenOrder): OrderData {

    const status = mapKrakenOrderStatus(order.status);
    const orderType = mapKrakenOrderType(order.descr.ordertype);
    const side: OrderSide = order.descr.type === 'buy' ? 'BUY' : 'SELL';

    return {
        symbol: order.descr.pair,
        clientOrderId: orderId,
        side,
        orderType,
        timeInForce: 'GTC',
        originalQuantity: parseFloat(order.vol),
        originalPrice: parseFloat(order.descr.price || order.price || '0'),
        averagePrice: parseFloat(order.price || '0'),
        stopPrice: parseFloat(order.stopprice || '0'),
        executionType: status,
        orderStatus: status,
        orderId: orderId,
        orderLastFilledQuantity: parseFloat(order.vol_exec || '0'),
        orderFilledAccumulatedQuantity: parseFloat(order.vol_exec || '0'),
        lastFilledPrice: parseFloat(order.price || '0'),
        commissionAsset: '',
        commission: order.fee || '0',
        orderTradeTime: order.opentm ? Math.floor(order.opentm * 1000) : undefined,
        tradeId: undefined,
        bidsNotional: undefined,
        askNotional: undefined,
        isMakerSide: false,
        isReduceOnly: false,
        workingType: 'CONTRACT_PRICE',
        originalOrderType: orderType,
        positionSide: 'BOTH',
        closeAll: false,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: false
    };
}

export function convertKrakenFuturesOrder(order: KrakenFuturesOpenOrder): OrderData {
    // console.log('Requested Kraken raw order:', order);
    const status = mapKrakenOrderStatus(order.status);
    const orderType = mapKrakenOrderType(order.orderType.toLowerCase());
    const side: OrderSide = order.side === 'buy' ? 'BUY' : 'SELL';

    return {
        symbol: order.symbol,
        clientOrderId: order.order_id,
        side,
        orderType,
        timeInForce: 'GTC',
        originalQuantity: order.size,
        originalPrice: order.limitPrice ?? 0,
        averagePrice: order.limitPrice ?? 0,
        stopPrice: order.stopPrice ?? 0,
        executionType: status,
        orderStatus: status,
        orderId: order.order_id,
        orderLastFilledQuantity: order.filledSize ?? 0,
        orderFilledAccumulatedQuantity: order.filledSize ?? 0,
        lastFilledPrice: order.limitPrice ?? 0,
        commissionAsset: '',
        commission: '0',
        orderTradeTime: order.timestamp,
        tradeId: undefined,
        bidsNotional: undefined,
        askNotional: undefined,
        isMakerSide: false,
        isReduceOnly: order.reduceOnly ?? false,
        workingType: 'CONTRACT_PRICE',
        originalOrderType: orderType,
        positionSide: 'BOTH',
        closeAll: false,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: false
    };
}

export function convertKrakenFuturesPosition(pos: KrakenFuturesOpenPosition): PositionData {
    const direction: PositionDirection = pos.side === 'short' ? 'SHORT' : 'LONG';
    return {
        symbol: pos.symbol,
        positionAmount: direction === 'LONG' ? pos.size : -pos.size,
        entryPrice: pos.entryPrice ?? 0,
        liquidationPrice: pos.liquidationPrice ?? 0,
        leverage: pos.leverage ?? 0,
        marginMode: pos.marginType ?? 'cross',
        positionDirection: direction,
        isInPosition: pos.size !== 0,
        unrealizedPnL: pos.unrealizedPnl ?? 0
    };
}

export function mapKrakenFuturesWsOrderType(type: string): OrderType {
    const normalized = type.replace(/_/g, '-');
    return mapKrakenOrderType(normalized);
}

export function convertKrakenFuturesWsOrder(order: KrakenFuturesWsOpenOrder, isCancel: boolean = false, reason?: string): OrderData {
    // console.log('Kraken raw order:', order);
    const side: OrderSide = order.direction === 0 ? 'BUY' : 'SELL';
    const orderType = mapKrakenFuturesWsOrderType(order.type);
    let status: OrderStatus = 'NEW';
    if (isCancel && reason === 'full_fill') status = 'FILLED';
    else if (isCancel && reason === 'contract_expired') status = 'EXPIRED';
    else if (isCancel && isKrakenRejectedOrderReason(reason)) status = 'REJECTED';
    else if (isCancel) status = 'CANCELED';
    else if (order.filled >= order.qty) status = 'FILLED';
    else if (order.filled > 0) status = 'PARTIALLY_FILLED';

    return {
        symbol: order.instrument,
        clientOrderId: order.order_id,
        side,
        orderType,
        timeInForce: 'GTC',
        originalQuantity: order.qty,
        originalPrice: order.limit_price ?? 0,
        averagePrice: order.limit_price ?? 0,
        stopPrice: order.stop_price ?? 0,
        executionType: status,
        orderStatus: status,
        orderId: order.order_id,
        orderLastFilledQuantity: order.filled,
        orderFilledAccumulatedQuantity: order.filled,
        lastFilledPrice: order.limit_price ?? 0,
        commissionAsset: '',
        commission: '0',
        orderTradeTime: order.last_update_time ?? order.time,
        tradeId: 0,
        bidsNotional: undefined,
        askNotional: undefined,
        isMakerSide: false,
        isReduceOnly: order.reduce_only,
        workingType: order.triggerSignal === 'mark' ? 'MARK_PRICE' : 'CONTRACT_PRICE',
        originalOrderType: orderType,
        positionSide: 'BOTH',
        closeAll: false,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: false
    };
}

function isKrakenRejectedOrderReason(reason?: string): boolean {
    return reason === 'not_enough_margin'
        || reason === 'ioc_order_failed_because_it_would_not_be_executed'
        || reason === 'post_order_failed_because_it_would_filled'
        || reason === 'would_execute_self'
        || reason === 'would_not_reduce_position'
        || reason === 'order_for_edit_not_found';
}

export function convertKrakenFuturesWsPosition(position: KrakenFuturesWsPosition): PositionData {
    const balance = position.balance ?? 0;
    const direction: PositionDirection = balance < 0 ? 'SHORT' : 'LONG';
    return {
        symbol: position.instrument,
        positionAmount: balance,
        entryPrice: position.entry_price ?? 0,
        liquidationPrice: position.liquidation_threshold ?? 0,
        leverage: position.effective_leverage ?? 0,
        marginMode: 'cross',
        positionDirection: direction,
        isInPosition: balance !== 0,
        unrealizedPnL: position.pnl ?? 0
    };
}

export function convertKrakenFuturesWsBalances(message: KrakenFuturesBalancesMessage): BalanceData[] {
    const balances: BalanceData[] = [];

    for (const [asset, balance] of Object.entries(message.holding ?? {})) {
        balances.push({
            asset: asset.toUpperCase(),
            balance: String(balance),
            crossWalletBalance: String(balance),
            balanceChange: '0'
        });
    }

    for (const wallet of Object.values(message.futures ?? {})) {
        if (!wallet.unit || wallet.balance === undefined) continue;
        balances.push({
            asset: wallet.unit.toUpperCase(),
            balance: String(wallet.balance),
            crossWalletBalance: String(wallet.available ?? wallet.balance),
            balanceChange: '0'
        });
    }

    if (message.flex_futures?.balance_value !== undefined) {
        const balance = message.flex_futures.balance_value;
        const available = message.flex_futures.available_margin ?? balance;
        // Kraken values the multi-collateral futures wallet in USD; expose it in the unified USDT settlement slot.
        balances.push({
            asset: 'USDT',
            balance: String(balance),
            crossWalletBalance: String(available),
            balanceChange: '0'
        });
    }

    return balances;
}

export function toBookTickerFromTicker(message: KrakenFuturesTickerMessage): BookTickerData | undefined {
    if (message.bid === undefined || message.ask === undefined) return undefined;
    return {
        symbol: message.product_id,
        bestBid: message.bid,
        bestBidQty: message.bid_size ?? 0,
        bestAsk: message.ask,
        bestAskQty: message.ask_size ?? 0
    };
}

export function toFundingFromTicker(message: KrakenFuturesTickerMessage): FundingData | undefined {
    if (message.relative_funding_rate === undefined || message.next_funding_rate_time === undefined) return undefined;
    const nextTime = typeof message.next_funding_rate_time === 'string'
        ? Date.parse(message.next_funding_rate_time)
        : message.next_funding_rate_time;
    return {
        symbol: message.product_id,
        rate: message.relative_funding_rate,
        nextFundingTime: nextTime,
        interval: undefined
    };
}

export function parseFuturesSymbolParts(symbol: string): { base: string; quote: string } {
    let clean = symbol;
    if (clean.startsWith('PI_') || clean.startsWith('PF_')) {
        clean = clean.slice(3);
    }
    const knownQuotes = ['USD', 'USDT', 'USDC', 'EUR', 'GBP', 'JPY'];
    for (const quote of knownQuotes) {
        if (clean.endsWith(quote)) {
            return { base: clean.slice(0, -quote.length), quote };
        }
    }
    if (clean.length > 3) {
        return { base: clean.slice(0, clean.length - 3), quote: clean.slice(-3) };
    }
    return { base: clean, quote: '' };
}

export function mapKrakenFuturesInstrumentToExtractedInfo(instrument: KrakenFuturesInstrument): ExtractedInfo {
    const symbol = instrument.symbol;
    const baseAsset = instrument.base ?? parseFuturesSymbolParts(symbol).base;
    const quoteAsset = instrument.quote ?? parseFuturesSymbolParts(symbol).quote;

    return {
        symbol,
        status: instrument.status && instrument.status !== 'online' ? 'BREAK' : 'TRADING',
        type: instrument.tradfi === true ? 'TRADFI' : 'COIN',
        minPrice: 0,
        maxPrice: 0,
        tickSize: instrument.tickSize ?? 0,
        stepSize: instrument.lotSize ?? instrument.contractSize ?? 1,
        minQty: instrument.lotSize ?? instrument.contractSize ?? 0,
        maxQty: 0,
        minNotional: 0,
        orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'],
        baseAsset,
        quoteAsset
    };
}

export function toSpotBookTickerFromTicker(ticker: KrakenSpotTickerData): BookTickerData {
    return {
        symbol: ticker.symbol,
        bestBid: ticker.bid,
        bestBidQty: ticker.bid_qty,
        bestAsk: ticker.ask,
        bestAskQty: ticker.ask_qty
    };
}
