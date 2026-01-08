"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertExchangeInfo = convertExchangeInfo;
exports.convertObjectIntoUrlEncoded = convertObjectIntoUrlEncoded;
exports.convertBybitFunding = convertBybitFunding;
exports.mapBybitTriggerBy = mapBybitTriggerBy;
exports.convertBybitKline = convertBybitKline;
exports.convertBybitOrder = convertBybitOrder;
exports.convertBybitPosition = convertBybitPosition;
function convertExchangeInfo(data) {
    // V5 Instruments Info
    const symbols = [];
    if (data && Array.isArray(data.list)) {
        for (const item of data.list) {
            // Map filters
            // Bybit: lotSizeFilter, priceFilter, leverageFilter
            const filters = [];
            if (item.lotSizeFilter) {
                filters.push({
                    filterType: 'LOT_SIZE',
                    minQty: item.lotSizeFilter.minOrderQty,
                    maxQty: item.lotSizeFilter.maxOrderQty,
                    stepSize: item.lotSizeFilter.qtyStep
                });
            }
            if (item.priceFilter) {
                filters.push({
                    filterType: 'PRICE_FILTER',
                    minPrice: item.priceFilter.minPrice,
                    maxPrice: item.priceFilter.maxPrice,
                    tickSize: item.priceFilter.tickSize
                });
            }
            symbols.push({
                symbol: item.symbol,
                status: item.status === 'Trading' ? 'TRADING' : 'BREAK',
                baseAsset: item.baseCoin,
                quoteAsset: item.quoteCoin,
                baseAssetPrecision: parseInt(item.lotSizeFilter?.postOnlyMaxOrderQty || '8'), // No direct field, approximate
                quoteAssetPrecision: 8,
                filters: filters,
                orderTypes: ['LIMIT', 'MARKET'] // V5 supports these
            });
        }
    }
    return {
        symbols,
        timezone: 'UTC',
        serverTime: Date.now() // Bybit instrument info response doesn't give server time, fetching separately or approximating
    };
}
function convertObjectIntoUrlEncoded(obj) {
    return Object.keys(obj).map(k => {
        if (Array.isArray(obj[k])) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(JSON.stringify(obj[k]));
        }
        return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
    }).join('&');
}
function convertBybitFunding(item) {
    return {
        symbol: item.symbol,
        rate: parseFloat(item.fundingRate),
        nextFundingTime: parseInt(item.nextFundingTime),
        interval: parseInt(item.fundingIntervalHour)
    };
}
// --- Helpers ---
function mapBybitTriggerBy(triggerBy) {
    if (triggerBy === 'MarkPrice')
        return 'MARK_PRICE';
    // Map LastPrice and IndexPrice (fallback) to CONTRACT_PRICE
    return 'CONTRACT_PRICE';
}
// --- Converters ---
function convertBybitKline(item, symbol) {
    // Bybit V5 kline: [startTime, open, high, low, close, volume, turnover]
    return {
        symbol,
        time: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        trades: 0 // Bybit V5 kline doesn't provide trade count in the standard array
    };
}
function convertBybitOrder(item) {
    // Map Bybit status to unified OrderStatus
    let status = 'NEW';
    if (item.orderStatus === 'New')
        status = 'NEW';
    else if (item.orderStatus === 'PartiallyFilled')
        status = 'PARTIALLY_FILLED';
    else if (item.orderStatus === 'Filled')
        status = 'FILLED';
    else if (item.orderStatus === 'Cancelled')
        status = 'CANCELED';
    else if (item.orderStatus === 'Rejected')
        status = 'REJECTED';
    else if (item.orderStatus === 'Untriggered')
        status = 'NEW'; // Conditional order waiting
    else if (item.orderStatus === 'Triggered')
        status = 'NEW';
    return {
        symbol: item.symbol,
        clientOrderId: item.orderLinkId || item.orderId,
        side: item.side.toUpperCase(),
        orderType: item.orderType.toUpperCase(),
        timeInForce: item.timeInForce,
        originalQuantity: parseFloat(item.qty),
        originalPrice: parseFloat(item.price || '0'),
        averagePrice: parseFloat(item.avgPrice || '0'),
        stopPrice: parseFloat(item.triggerPrice || '0'),
        executionType: status, // Bybit doesn't have a separate execType map 1:1 easily
        orderStatus: status,
        orderId: item.orderId,
        orderLastFilledQuantity: parseFloat(item.lastExecQty || '0'),
        orderFilledAccumulatedQuantity: parseFloat(item.cumExecQty || '0'),
        lastFilledPrice: parseFloat(item.lastExecPrice || '0'),
        commissionAsset: '', // Need to parse from separate field if available
        commission: parseFloat(item.cumExecFee || '0').toString(),
        orderTradeTime: parseInt(item.updatedTime || item.createdTime),
        tradeId: 0,
        isMakerSide: false,
        isReduceOnly: item.reduceOnly,
        workingType: 'CONTRACT_PRICE', // Default assumption
        originalOrderType: item.orderType.toUpperCase(),
        positionSide: item.positionIdx === 1 ? 'LONG' : (item.positionIdx === 2 ? 'SHORT' : 'BOTH'),
        closeAll: false,
        activationPrice: item.triggerPrice,
        callbackRate: '',
        realizedProfit: '', // Bybit gives this in closed PnL usually
        isAlgoOrder: false
    };
}
function convertBybitPosition(item) {
    const size = parseFloat(item.size);
    // positionIdx: 0=One-Way, 1=Buy side of Hedge, 2=Sell side of Hedge
    let direction = 'LONG';
    if (item.positionIdx === 2)
        direction = 'SHORT';
    else if (item.side === 'Sell')
        direction = 'SHORT'; // Fallback for One-Way
    return {
        symbol: item.symbol,
        positionAmount: size,
        entryPrice: parseFloat(item.avgPrice || '0'),
        positionDirection: direction,
        isInPosition: size > 0,
        unrealizedPnL: parseFloat(item.unrealisedPnl || '0')
    };
}
