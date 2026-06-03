import type {
    AggTradesData,
    BalanceData,
    BookTickerData,
    DepthData,
    ExtractedInfo,
    FundingData,
    FundingHistoryData,
    KlineData,
    OrderData,
    OrderRequestResponse,
    OrderSide,
    OrderStatus,
    OrderType,
    OrderWorkingType,
    PositionData,
    PositionDirection,
    PositionRiskData,
    PositionSide,
    StaticDepth,
    TimeInForce
} from '../core/types.js';

export type BitgetProductType = 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES';
export type BitgetInstType = 'SPOT' | BitgetProductType;
export type BitgetOrderSide = 'buy' | 'sell';
export type BitgetOrderType = 'limit' | 'market';
export type BitgetForce = 'gtc' | 'ioc' | 'fok' | 'post_only';
export type BitgetMarginMode = 'isolated' | 'crossed';
export type BitgetHoldSide = 'long' | 'short';
export type BitgetOrderStatus = 'live' | 'partially_filled' | 'filled' | 'cancelled';
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
    symbolType?: string;
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
    symbol: string;
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
}

export interface BitgetWsEvent {
    event?: string;
    code?: string;
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
}

export const BITGET_SUCCESS_CODE = '00000';

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function asArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
    return Array.isArray(value) ? value.filter(guard) : [];
}

export function toNumber(value: string | undefined, fallback = 0): number {
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function decimalStepFromPlaces(places: string | undefined): number {
    const digits = Number(places ?? '0');
    if (!Number.isInteger(digits) || digits <= 0) return 1;
    return Number(`1e-${digits}`);
}

export function normalizeTimeInForce(force: BitgetForce | string | undefined): TimeInForce {
    if (force === 'ioc') return 'IOC';
    if (force === 'fok') return 'FOK';
    if (force === 'post_only') return 'GTX';
    return 'GTC';
}

export function toBitgetForce(timeInForce?: TimeInForce): BitgetForce {
    if (timeInForce === 'IOC') return 'ioc';
    if (timeInForce === 'FOK') return 'fok';
    if (timeInForce === 'GTX') return 'post_only';
    return 'gtc';
}

export function toBitgetSide(side: OrderSide): BitgetOrderSide {
    return side === 'BUY' ? 'buy' : 'sell';
}

export function toUnifiedSide(side: string): OrderSide {
    return side.toLowerCase() === 'buy' ? 'BUY' : 'SELL';
}

export function toBitgetOrderType(type: OrderType): BitgetOrderType {
    return type === 'MARKET' || type === 'STOP_MARKET' || type === 'TAKE_PROFIT_MARKET' ? 'market' : 'limit';
}

export function toUnifiedOrderStatus(status: string | undefined): OrderStatus {
    if (status === 'partially_filled') return 'PARTIALLY_FILLED';
    if (status === 'filled') return 'FILLED';
    if (status === 'cancelled') return 'CANCELED';
    return 'NEW';
}

export function toUnifiedPositionSide(posSide: string | undefined): PositionSide {
    if (posSide === 'long') return 'LONG';
    if (posSide === 'short') return 'SHORT';
    return 'BOTH';
}

export function toPositionDirection(holdSide: string | undefined): PositionDirection {
    return holdSide === 'short' ? 'SHORT' : 'LONG';
}

export function mapWorkingType(triggerType?: BitgetTriggerType): OrderWorkingType {
    return triggerType === 'mark_price' ? 'MARK_PRICE' : 'CONTRACT_PRICE';
}

export function isBitgetSpotSymbol(value: unknown): value is BitgetSpotSymbol {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.baseCoin)
        && isString(value.quoteCoin)
        && isString(value.pricePrecision)
        && isString(value.quantityPrecision)
        && isString(value.status);
}

export function isBitgetFuturesContract(value: unknown): value is BitgetFuturesContract {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.baseCoin)
        && isString(value.quoteCoin)
        && isString(value.minTradeNum)
        && isString(value.volumePlace)
        && isString(value.pricePlace)
        && isString(value.sizeMultiplier)
        && isString(value.symbolStatus);
}

export function isBitgetOrderBook(value: unknown): value is BitgetOrderBook {
    return isRecord(value) && isDepthLevels(value.asks) && isDepthLevels(value.bids);
}

export function isBitgetCandle(value: unknown): value is BitgetCandle {
    return Array.isArray(value) && value.length >= 7 && value.slice(0, 7).every(isString);
}

export function isBitgetTrade(value: unknown): value is BitgetTrade {
    return isRecord(value)
        && isString(value.side)
        && isString(value.price)
        && isString(value.size)
        && isString(value.ts);
}

export function isBitgetFundingHistoryItem(value: unknown): value is BitgetFundingHistoryItem {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.fundingRate)
        && isString(value.fundingTime);
}

export function isBitgetSpotAsset(value: unknown): value is BitgetSpotAsset {
    return isRecord(value)
        && isString(value.coin)
        && isString(value.available)
        && isString(value.frozen)
        && isString(value.locked);
}

export function isBitgetFuturesAccount(value: unknown): value is BitgetFuturesAccount {
    return isRecord(value)
        && isString(value.marginCoin)
        && isString(value.locked)
        && isString(value.available);
}

export function isBitgetPosition(value: unknown): value is BitgetPosition {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.holdSide)
        && isString(value.total)
        && isString(value.leverage)
        && isString(value.openPriceAvg)
        && isString(value.marginMode)
        && isString(value.unrealizedPL);
}

export function isBitgetOrder(value: unknown): value is BitgetOrder {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.size)
        && isString(value.orderId)
        && isString(value.side);
}

export function isBitgetPendingOrders(value: unknown): value is BitgetPendingOrders {
    return isRecord(value);
}

export function isBitgetPlaceOrderResponse(value: unknown): value is BitgetPlaceOrderResponse {
    return isRecord(value)
        && (value.orderId === undefined || isString(value.orderId))
        && (value.clientOid === undefined || isString(value.clientOid));
}

export function isBitgetWsEvent(value: unknown): value is BitgetWsEvent {
    return isRecord(value);
}

export function isBitgetWsDepth(value: unknown): value is BitgetWsDepth {
    return isRecord(value) && isDepthLevels(value.asks) && isDepthLevels(value.bids);
}

export function isBitgetWsTicker(value: unknown): value is BitgetWsTicker {
    return isRecord(value);
}

export function isBitgetWsTrade(value: unknown): value is BitgetWsTrade {
    return isRecord(value)
        && isString(value.price)
        && isString(value.size)
        && isString(value.side)
        && isString(value.ts);
}

export function isBitgetWsCandle(value: unknown): value is BitgetWsCandle {
    return isRecord(value)
        && isString(value.open)
        && isString(value.high)
        && isString(value.low)
        && isString(value.close);
}

export function isBitgetWsAccount(value: unknown): value is BitgetWsAccount {
    return isRecord(value);
}

export function isBitgetWsPosition(value: unknown): value is BitgetWsPosition {
    return isRecord(value);
}

function isDepthLevels(value: unknown): value is Array<[string | number, string | number]> {
    return Array.isArray(value)
        && value.every(level => Array.isArray(level) && level.length >= 2 && (isString(level[0]) || isNumber(level[0])) && (isString(level[1]) || isNumber(level[1])));
}

function normalizeDepthLevels(levels: Array<[string | number, string | number]>): Array<[string, string]> {
    return levels.map(level => [String(level[0]), String(level[1])]);
}

export function convertSpotExchangeInfo(items: BitgetSpotSymbol[]): { [key: string]: ExtractedInfo } {
    const info: { [key: string]: ExtractedInfo } = {};
    for (const item of items) {
        if (item.status !== 'online') continue;
        info[item.symbol] = {
            symbol: item.symbol,
            status: 'TRADING',
            type: 'COIN',
            baseAsset: item.baseCoin,
            quoteAsset: item.quoteCoin,
            minPrice: decimalStepFromPlaces(item.pricePrecision),
            maxPrice: Number.MAX_SAFE_INTEGER,
            tickSize: decimalStepFromPlaces(item.pricePrecision),
            stepSize: decimalStepFromPlaces(item.quantityPrecision),
            minQty: toNumber(item.minTradeAmount),
            maxQty: toNumber(item.maxTradeAmount, Number.MAX_SAFE_INTEGER),
            minNotional: toNumber(item.minTradeUSDT),
            orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT']
        };
    }
    return info;
}

export function convertFuturesExchangeInfo(items: BitgetFuturesContract[]): { [key: string]: ExtractedInfo } {
    const info: { [key: string]: ExtractedInfo } = {};
    for (const item of items) {
        if (item.symbolStatus !== 'normal') continue;
        info[item.symbol] = {
            symbol: item.symbol,
            status: 'TRADING',
            type: 'COIN',
            baseAsset: item.baseCoin,
            quoteAsset: item.quoteCoin,
            minPrice: decimalStepFromPlaces(item.pricePlace),
            maxPrice: Number.MAX_SAFE_INTEGER,
            tickSize: decimalStepFromPlaces(item.pricePlace) * toNumber(item.priceEndStep, 1),
            stepSize: toNumber(item.sizeMultiplier),
            minQty: toNumber(item.minTradeNum),
            maxQty: toNumber(item.maxOrderQty, Number.MAX_SAFE_INTEGER),
            minNotional: toNumber(item.minTradeUSDT),
            orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT']
        };
    }
    return info;
}

export function convertDepth(symbol: string, data: BitgetOrderBook): StaticDepth {
    void symbol;
    return {
        lastUpdateId: toNumber(data.ts),
        asks: normalizeDepthLevels(data.asks),
        bids: normalizeDepthLevels(data.bids)
    };
}

export function convertWsDepth(symbol: string, data: BitgetWsDepth): DepthData {
    return {
        symbol,
        asks: normalizeDepthLevels(data.asks),
        bids: normalizeDepthLevels(data.bids)
    };
}

export function convertCandle(item: BitgetCandle, symbol: string): KlineData {
    return {
        symbol,
        time: toNumber(item[0]),
        open: toNumber(item[1]),
        high: toNumber(item[2]),
        low: toNumber(item[3]),
        close: toNumber(item[4]),
        volume: toNumber(item[5]),
        trades: 0
    };
}

export function convertWsCandle(item: BitgetWsCandle, symbol: string): KlineData {
    return {
        symbol,
        time: toNumber(item.startTime ?? item.ts),
        open: toNumber(item.open),
        high: toNumber(item.high),
        low: toNumber(item.low),
        close: toNumber(item.close),
        volume: toNumber(item.baseVol ?? item.volume),
        trades: 0
    };
}

export function convertTrade(item: BitgetTrade, fallbackSymbol: string): AggTradesData {
    return {
        symbol: item.symbol ?? fallbackSymbol,
        id: toNumber(item.tradeId),
        price: toNumber(item.price),
        quantity: toNumber(item.size),
        time: toNumber(item.ts),
        isBuyer: item.side.toLowerCase() === 'buy'
    };
}

export function convertWsTrade(item: BitgetWsTrade, fallbackSymbol: string) {
    return {
        symbol: item.instId ?? fallbackSymbol,
        price: toNumber(item.price),
        quantity: toNumber(item.size),
        tradeTime: toNumber(item.ts),
        orderType: item.side.toLowerCase() === 'buy' ? 'BUY' as const : 'SELL' as const
    };
}

export function convertFundingHistory(item: BitgetFundingHistoryItem): FundingHistoryData {
    return {
        symbol: item.symbol,
        fundingTime: toNumber(item.fundingTime),
        rate: toNumber(item.fundingRate)
    };
}

export function convertSpotAsset(item: BitgetSpotAsset): BalanceData {
    const available = toNumber(item.available);
    const frozen = toNumber(item.frozen);
    const locked = toNumber(item.locked);
    const total = available + frozen + locked;
    return {
        asset: item.coin.toUpperCase(),
        balance: total.toString(),
        crossWalletBalance: item.available,
        balanceChange: '0'
    };
}

export function convertFuturesAccount(item: BitgetFuturesAccount): BalanceData {
    const equity = item.equity ?? item.usdtEquity ?? item.available;
    return {
        asset: item.marginCoin,
        balance: equity,
        crossWalletBalance: item.available,
        balanceChange: '0'
    };
}

export function convertPositionRisk(item: BitgetPosition): PositionRiskData {
    const direction = toPositionDirection(item.holdSide);
    const amount = toNumber(item.total);
    return {
        symbol: item.symbol,
        positionAmount: amount,
        entryPrice: toNumber(item.openPriceAvg),
        markPrice: toNumber(item.markPrice),
        unrealizedPnL: toNumber(item.unrealizedPL),
        liquidationPrice: toNumber(item.liquidationPrice),
        leverage: toNumber(item.leverage),
        marginType: item.marginMode === 'isolated' ? 'isolated' : 'cross',
        isolatedMargin: item.marginMode === 'isolated' ? amount * toNumber(item.openPriceAvg) : 0,
        positionSide: direction,
        notionalValue: amount * toNumber(item.markPrice ?? item.openPriceAvg),
        maxNotionalValue: 0,
        isAutoAddMargin: false,
        updateTime: toNumber(item.uTime)
    };
}

export function convertPosition(item: BitgetPosition | BitgetWsPosition): PositionData {
    const symbol = 'symbol' in item && item.symbol ? item.symbol : 'instId' in item && item.instId ? item.instId : '';
    const direction = toPositionDirection(item.holdSide);
    const amount = toNumber(item.total);
    return {
        symbol,
        positionAmount: direction === 'SHORT' ? -amount : amount,
        entryPrice: toNumber(item.openPriceAvg),
        positionDirection: direction,
        isInPosition: amount !== 0,
        unrealizedPnL: toNumber(item.unrealizedPL)
    };
}

export function convertOrder(item: BitgetOrder): OrderData {
    const status = toUnifiedOrderStatus(item.status);
    const orderType: OrderType = item.orderType === 'market' ? 'MARKET' : 'LIMIT';
    const side = toUnifiedSide(item.side);
    return {
        symbol: item.symbol.toUpperCase(),
        clientOrderId: item.clientOid || item.orderId,
        side,
        orderType,
        timeInForce: normalizeTimeInForce(item.force),
        originalQuantity: toNumber(item.size),
        originalPrice: toNumber(item.price),
        averagePrice: toNumber(item.priceAvg),
        stopPrice: 0,
        executionType: status,
        orderStatus: status,
        orderId: item.orderId,
        orderLastFilledQuantity: 0,
        orderFilledAccumulatedQuantity: toNumber(item.baseVolume),
        lastFilledPrice: toNumber(item.priceAvg),
        commissionAsset: '',
        commission: item.fee ?? '0',
        orderTradeTime: toNumber(item.uTime ?? item.cTime),
        tradeId: 0,
        bidsNotional: undefined,
        askNotional: undefined,
        isMakerSide: false,
        isReduceOnly: item.reduceOnly === 'YES',
        workingType: 'CONTRACT_PRICE',
        originalOrderType: orderType,
        positionSide: toUnifiedPositionSide(item.posSide),
        closeAll: false,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: item.totalProfits ?? '',
        isAlgoOrder: false
    };
}

export function createOrderResponse(input: {
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
}): OrderRequestResponse {
    return {
        orderId: toNumber(input.response.orderId),
        symbol: input.symbol,
        status: 'NEW',
        clientOrderId: input.response.clientOid ?? input.clientOid,
        price: (input.price ?? 0).toString(),
        avgPrice: '0',
        origQty: (input.quantity ?? 0).toString(),
        executedQty: '0',
        cumQuote: '0',
        timeInForce: input.timeInForce ?? 'GTC',
        type: input.type,
        reduceOnly: input.reduceOnly ?? false,
        closePosition: input.closePosition ?? false,
        side: input.side,
        positionSide: 'BOTH',
        stopPrice: input.stopPrice?.toString(),
        workingType: input.workingType ?? 'CONTRACT_PRICE',
        priceProtect: false,
        origType: input.type,
        time: Date.now()
    };
}

export function convertTicker(data: BitgetWsTicker, fallbackSymbol: string): BookTickerData | undefined {
    const bid = toNumber(data.bidPr);
    const ask = toNumber(data.askPr);
    if (bid <= 0 || ask <= 0) return undefined;
    return {
        symbol: data.instId ?? data.symbol ?? fallbackSymbol,
        bestBid: bid,
        bestBidQty: toNumber(data.bidSz),
        bestAsk: ask,
        bestAskQty: toNumber(data.askSz)
    };
}

export function convertBookTickerFromDepth(data: BitgetWsDepth, fallbackSymbol: string): BookTickerData | undefined {
    const bestBid = data.bids[0];
    const bestAsk = data.asks[0];
    if (!bestBid || !bestAsk) return undefined;

    const bid = toNumber(String(bestBid[0]));
    const bidQty = toNumber(String(bestBid[1]));
    const ask = toNumber(String(bestAsk[0]));
    const askQty = toNumber(String(bestAsk[1]));

    if (bid <= 0 || ask <= 0) return undefined;

    return {
        symbol: fallbackSymbol,
        bestBid: bid,
        bestBidQty: bidQty,
        bestAsk: ask,
        bestAskQty: askQty
    };
}

export function convertFunding(data: BitgetWsTicker, fallbackSymbol: string): FundingData | undefined {
    if (data.fundingRate === undefined && data.nextFundingTime === undefined && data.fundingTime === undefined) return undefined;
    return {
        symbol: data.instId ?? data.symbol ?? fallbackSymbol,
        rate: toNumber(data.fundingRate),
        nextFundingTime: toNumber(data.nextFundingTime ?? data.fundingTime),
        interval: undefined
    };
}
