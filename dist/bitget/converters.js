export const BITGET_SUCCESS_CODE = '00000';
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isString(value) {
    return typeof value === 'string';
}
export function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
export function asArray(value, guard) {
    return Array.isArray(value) ? value.filter(guard) : [];
}
export function toNumber(value, fallback = 0) {
    if (value === undefined || value === '')
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
export function decimalStepFromPlaces(places) {
    const digits = Number(places ?? '0');
    if (!Number.isInteger(digits) || digits <= 0)
        return 1;
    return Number(`1e-${digits}`);
}
export function normalizeTimeInForce(force) {
    if (force === 'ioc')
        return 'IOC';
    if (force === 'fok')
        return 'FOK';
    if (force === 'post_only')
        return 'GTX';
    return 'GTC';
}
export function toBitgetForce(timeInForce) {
    if (timeInForce === 'IOC')
        return 'ioc';
    if (timeInForce === 'FOK')
        return 'fok';
    if (timeInForce === 'GTX')
        return 'post_only';
    return 'gtc';
}
export function toBitgetSide(side) {
    return side === 'BUY' ? 'buy' : 'sell';
}
export function toUnifiedSide(side) {
    return side.toLowerCase() === 'buy' ? 'BUY' : 'SELL';
}
export function toBitgetOrderType(type) {
    return type === 'MARKET' || type === 'STOP_MARKET' || type === 'TAKE_PROFIT_MARKET' ? 'market' : 'limit';
}
export function toUnifiedOrderStatus(status) {
    if (status === 'partially_filled')
        return 'PARTIALLY_FILLED';
    if (status === 'filled')
        return 'FILLED';
    if (status === 'cancelled')
        return 'CANCELED';
    return 'NEW';
}
export function toUnifiedPositionSide(posSide) {
    if (posSide === 'long')
        return 'LONG';
    if (posSide === 'short')
        return 'SHORT';
    return 'BOTH';
}
export function toPositionDirection(holdSide) {
    return holdSide === 'short' ? 'SHORT' : 'LONG';
}
export function mapWorkingType(triggerType) {
    return triggerType === 'mark_price' ? 'MARK_PRICE' : 'CONTRACT_PRICE';
}
export function isBitgetSpotSymbol(value) {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.baseCoin)
        && isString(value.quoteCoin)
        && isString(value.pricePrecision)
        && isString(value.quantityPrecision)
        && isString(value.status);
}
export function isBitgetFuturesContract(value) {
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
export function isBitgetOrderBook(value) {
    return isRecord(value) && isDepthLevels(value.asks) && isDepthLevels(value.bids);
}
export function isBitgetCandle(value) {
    return Array.isArray(value) && value.length >= 7 && value.slice(0, 7).every(isString);
}
export function isBitgetTrade(value) {
    return isRecord(value)
        && isString(value.side)
        && isString(value.price)
        && isString(value.size)
        && isString(value.ts);
}
export function isBitgetFundingHistoryItem(value) {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.fundingRate)
        && isString(value.fundingTime);
}
export function isBitgetSpotAsset(value) {
    return isRecord(value)
        && isString(value.coin)
        && isString(value.available)
        && isString(value.frozen)
        && isString(value.locked);
}
export function isBitgetFuturesAccount(value) {
    return isRecord(value)
        && isString(value.marginCoin)
        && isString(value.locked)
        && isString(value.available);
}
export function isBitgetPosition(value) {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.holdSide)
        && isString(value.total)
        && isString(value.leverage)
        && isString(value.openPriceAvg)
        && isString(value.marginMode)
        && isString(value.unrealizedPL);
}
export function isBitgetOrder(value) {
    return isRecord(value)
        && isString(value.symbol)
        && isString(value.size)
        && isString(value.orderId)
        && isString(value.side);
}
export function isBitgetPendingOrders(value) {
    return isRecord(value);
}
export function isBitgetPlaceOrderResponse(value) {
    return isRecord(value)
        && (value.orderId === undefined || isString(value.orderId))
        && (value.clientOid === undefined || isString(value.clientOid));
}
export function isBitgetWsEvent(value) {
    return isRecord(value);
}
export function isBitgetWsDepth(value) {
    return isRecord(value) && isDepthLevels(value.asks) && isDepthLevels(value.bids);
}
export function isBitgetWsTicker(value) {
    return isRecord(value);
}
export function isBitgetWsTrade(value) {
    return isRecord(value)
        && isString(value.price)
        && isString(value.size)
        && isString(value.side)
        && isString(value.ts);
}
export function isBitgetWsCandle(value) {
    return isRecord(value)
        && isString(value.open)
        && isString(value.high)
        && isString(value.low)
        && isString(value.close);
}
export function isBitgetWsAccount(value) {
    return isRecord(value);
}
export function isBitgetWsPosition(value) {
    return isRecord(value);
}
function isDepthLevels(value) {
    return Array.isArray(value)
        && value.every(level => Array.isArray(level) && level.length >= 2 && (isString(level[0]) || isNumber(level[0])) && (isString(level[1]) || isNumber(level[1])));
}
function normalizeDepthLevels(levels) {
    return levels.map(level => [String(level[0]), String(level[1])]);
}
export function convertSpotExchangeInfo(items) {
    const info = {};
    for (const item of items) {
        if (item.status !== 'online')
            continue;
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
export function convertFuturesExchangeInfo(items) {
    const info = {};
    for (const item of items) {
        if (item.symbolStatus !== 'normal')
            continue;
        info[item.symbol] = {
            symbol: item.symbol,
            status: 'TRADING',
            type: item.isRwa == "NO" ? 'COIN' : 'UNKNOWN',
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
export function convertDepth(symbol, data) {
    void symbol;
    return {
        lastUpdateId: toNumber(data.ts),
        asks: normalizeDepthLevels(data.asks),
        bids: normalizeDepthLevels(data.bids)
    };
}
export function convertWsDepth(symbol, data) {
    return {
        symbol,
        asks: normalizeDepthLevels(data.asks),
        bids: normalizeDepthLevels(data.bids)
    };
}
export function convertCandle(item, symbol) {
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
export function convertWsCandle(item, symbol) {
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
export function convertTrade(item, fallbackSymbol) {
    return {
        symbol: item.symbol ?? fallbackSymbol,
        id: toNumber(item.tradeId),
        price: toNumber(item.price),
        quantity: toNumber(item.size),
        time: toNumber(item.ts),
        isBuyer: item.side.toLowerCase() === 'buy'
    };
}
export function convertWsTrade(item, fallbackSymbol) {
    return {
        symbol: item.instId ?? fallbackSymbol,
        price: toNumber(item.price),
        quantity: toNumber(item.size),
        tradeTime: toNumber(item.ts),
        orderType: item.side.toLowerCase() === 'buy' ? 'BUY' : 'SELL'
    };
}
export function convertFundingHistory(item) {
    return {
        symbol: item.symbol,
        fundingTime: toNumber(item.fundingTime),
        rate: toNumber(item.fundingRate)
    };
}
export function convertSpotAsset(item) {
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
export function convertFuturesAccount(item) {
    const equity = item.equity ?? item.usdtEquity ?? item.available;
    return {
        asset: item.marginCoin,
        balance: equity,
        crossWalletBalance: item.available,
        balanceChange: '0'
    };
}
export function convertPositionRisk(item) {
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
export function convertPosition(item) {
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
export function convertOrder(item) {
    const status = toUnifiedOrderStatus(item.status);
    const orderType = item.orderType === 'market' ? 'MARKET' : 'LIMIT';
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
export function createOrderResponse(input) {
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
export function convertTicker(data, fallbackSymbol) {
    const bid = toNumber(data.bidPr);
    const ask = toNumber(data.askPr);
    if (bid <= 0 || ask <= 0)
        return undefined;
    return {
        symbol: data.instId ?? data.symbol ?? fallbackSymbol,
        bestBid: bid,
        bestBidQty: toNumber(data.bidSz),
        bestAsk: ask,
        bestAskQty: toNumber(data.askSz)
    };
}
export function convertBookTickerFromDepth(data, fallbackSymbol) {
    const bestBid = data.bids[0];
    const bestAsk = data.asks[0];
    if (!bestBid || !bestAsk)
        return undefined;
    const bid = toNumber(String(bestBid[0]));
    const bidQty = toNumber(String(bestBid[1]));
    const ask = toNumber(String(bestAsk[0]));
    const askQty = toNumber(String(bestAsk[1]));
    if (bid <= 0 || ask <= 0)
        return undefined;
    return {
        symbol: fallbackSymbol,
        bestBid: bid,
        bestBidQty: bidQty,
        bestAsk: ask,
        bestAskQty: askQty
    };
}
export function convertFunding(data, fallbackSymbol) {
    if (data.fundingRate === undefined && data.nextFundingTime === undefined && data.fundingTime === undefined)
        return undefined;
    return {
        symbol: data.instId ?? data.symbol ?? fallbackSymbol,
        rate: toNumber(data.fundingRate),
        nextFundingTime: toNumber(data.nextFundingTime ?? data.fundingTime),
        interval: undefined
    };
}
