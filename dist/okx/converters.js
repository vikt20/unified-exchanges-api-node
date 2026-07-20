// --- OKX REST Types ---
export function convertExchangeInfo(data) {
    const info = {};
    if (data && Array.isArray(data)) {
        for (const item of data) {
            if (item.state !== 'live')
                continue;
            info[item.instId] = {
                symbol: item.instId,
                status: item.state === 'live' ? 'TRADING' : 'BREAK',
                type: parseFloat(item.instCategory || '0') === 1 && item.ruleType === 'normal' ? 'COIN' : 'UNKNOWN',
                baseAsset: item.baseCcy || item.settleCcy,
                quoteAsset: item.quoteCcy || item.settleCcy,
                minPrice: parseFloat(item.tickSz || '0'),
                maxPrice: 0, // OKX does not specify max price explicitly in typical API response
                tickSize: parseFloat(item.tickSz || '0'),
                stepSize: parseFloat(item.lotSz || '0') * parseFloat(item.ctVal || '0'),
                minQty: parseFloat(item.minSz || '0'),
                maxQty: 0,
                minNotional: 0,
                orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'],
                additionalInfo: {
                    okx_ctVal: parseFloat(item.ctVal || '0')
                }
            };
        }
    }
    return info;
}
export function convertOkxKline(item, symbol) {
    // OKX v5 kline: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
    return {
        symbol,
        time: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]), // contract volume
        trades: 0 // Not provided in typical OKX candle
    };
}
const okxHasValue = (value) => value !== undefined && value !== '' && value !== '0';
const okxIsMarketPx = (value) => value === '-1';
const mapOkxWorkingType = (pxType) => {
    if (pxType === 'mark')
        return 'MARK_PRICE';
    return 'CONTRACT_PRICE';
};
export function mapOkxOrderType(item) {
    if (item.ordType === 'move_order_stop')
        return 'TRAILING_STOP_MARKET';
    const hasStopLoss = okxHasValue(item.slTriggerPx);
    const hasTakeProfit = okxHasValue(item.tpTriggerPx);
    if (hasStopLoss) {
        return okxIsMarketPx(item.slOrdPx) ? 'STOP_MARKET' : 'STOP_LOSS_LIMIT';
    }
    if (hasTakeProfit) {
        return okxIsMarketPx(item.tpOrdPx) ? 'TAKE_PROFIT_MARKET' : 'TAKE_PROFIT_LIMIT';
    }
    const hasTrigger = okxHasValue(item.triggerPx);
    if (hasTrigger) {
        return okxIsMarketPx(item.orderPx) ? 'STOP_MARKET' : 'STOP';
    }
    if (item.ordType === 'market')
        return 'MARKET';
    if (item.ordType === 'limit')
        return 'LIMIT';
    if (item.ordType === 'conditional')
        return okxIsMarketPx(item.orderPx) ? 'STOP_MARKET' : 'STOP';
    if (item.ordType === 'trigger')
        return okxIsMarketPx(item.orderPx) ? 'STOP_MARKET' : 'STOP';
    return 'LIMIT';
}
const mapOkxStopPrice = (item, orderType) => {
    if (orderType === 'TAKE_PROFIT_MARKET' || orderType === 'TAKE_PROFIT_LIMIT') {
        return item.tpTriggerPx || item.triggerPx;
    }
    if (orderType === 'STOP_MARKET' || orderType === 'STOP_LOSS_LIMIT' || orderType === 'STOP') {
        return item.slTriggerPx || item.triggerPx;
    }
    return item.triggerPx || item.slTriggerPx || item.tpTriggerPx;
};
export function convertOkxOrder(item) {
    let status = 'NEW';
    const state = item.state;
    if (state === 'live')
        status = 'NEW';
    else if (state === 'canceled')
        status = 'CANCELED';
    else if (state === 'partially_filled')
        status = 'PARTIALLY_FILLED';
    else if (state === 'filled')
        status = 'FILLED';
    else if (state === 'mmp_canceled')
        status = 'CANCELED';
    // Algo orders usually have a different state
    if (item.actualOrder || item.ordType === 'conditional' || item.ordType === 'trigger') {
        if (state === 'effective')
            status = 'TRIGGERED';
        else if (state === 'canceled' || state === 'order_failed')
            status = 'CANCELED';
        else if (state === 'live')
            status = 'NEW';
    }
    const side = item.side?.toUpperCase() || 'BUY';
    let positionSide = "BOTH";
    if (item.posSide === 'long')
        positionSide = "LONG";
    else if (item.posSide === 'short')
        positionSide = "SHORT";
    const orderType = mapOkxOrderType(item);
    const stopPriceRaw = mapOkxStopPrice(item, orderType);
    const workingType = mapOkxWorkingType(item.slTriggerPxType || item.tpTriggerPxType || item.triggerPxType);
    return {
        symbol: item.instId,
        clientOrderId: item.algoId || item.ordId || item.algoClOrdId || item.clOrdId,
        side: side,
        orderType: orderType,
        timeInForce: 'GTC', // Mapping may be required
        originalQuantity: parseFloat(item.sz || '0'),
        originalPrice: parseFloat(item.px || '0'),
        averagePrice: parseFloat(item.avgPx || '0'),
        stopPrice: parseFloat(stopPriceRaw || '0'),
        executionType: status,
        orderStatus: status,
        orderId: item.ordId || item.algoId,
        orderLastFilledQuantity: parseFloat(item.fillSz || '0'),
        orderFilledAccumulatedQuantity: parseFloat(item.accFillSz || '0'),
        lastFilledPrice: parseFloat(item.fillPx || '0'),
        commissionAsset: item.feeCcy || '',
        commission: parseFloat(item.fee || '0').toString(),
        orderTradeTime: parseInt(item.uTime || item.cTime || '0'),
        tradeId: 0,
        isMakerSide: item.execType === 'M',
        isReduceOnly: item.reduceOnly === true || item.reduceOnly === 'true',
        workingType: workingType,
        originalOrderType: orderType,
        positionSide: positionSide,
        closeAll: item.closeFraction === '1',
        activationPrice: item.triggerPx || '0',
        callbackRate: '',
        realizedProfit: item.pnl || '0',
        isAlgoOrder: !!item.algoId || item.ordType === 'conditional' || item.ordType === 'trigger'
    };
}
export function convertOkxPosition(item) {
    const size = parseFloat(item.pos);
    let direction = 'LONG';
    if (item.posSide === 'net') {
        direction = size >= 0 ? 'LONG' : 'SHORT';
    }
    else if (item.posSide === 'short') {
        direction = 'SHORT';
    }
    return {
        symbol: item.instId,
        positionAmount: Math.abs(size), // Generally absolute for positions
        entryPrice: parseFloat(item.avgPx || '0'),
        positionDirection: direction,
        isInPosition: Math.abs(size) > 0,
        unrealizedPnL: parseFloat(item.upl || '0'),
        raw_data: item
    };
}
