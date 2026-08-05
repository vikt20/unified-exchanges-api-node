// --- Helpers ---
export function normalizeKrakenAsset(asset) {
    if (!asset)
        return '';
    let normalized = asset;
    if ((asset.startsWith('X') || asset.startsWith('Z')) && asset.length > 3) {
        normalized = asset.slice(1);
    }
    if (normalized === 'XBT')
        return 'BTC';
    if (normalized === 'XDG')
        return 'DOGE';
    return normalized;
}
export function toSymbolKey(pairKey, pair) {
    if (pair.altname && pair.altname.length > 0)
        return pair.altname;
    if (pair.wsname)
        return pair.wsname.replace('/', '');
    return pairKey;
}
export function convertKrakenAssetPairsToExtractedInfo(pairs) {
    const info = {};
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
            rawData: pair,
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
export function mapKrakenOrderStatus(status) {
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
export function mapKrakenOrderType(orderType) {
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
export function convertKrakenOpenOrder(orderId, order) {
    const status = mapKrakenOrderStatus(order.status);
    const orderType = mapKrakenOrderType(order.descr.ordertype);
    const side = order.descr.type === 'buy' ? 'BUY' : 'SELL';
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
export function convertKrakenFuturesOrder(order) {
    // console.log('Requested Kraken raw order:', order);
    const status = mapKrakenOrderStatus(order.status);
    const orderType = mapKrakenOrderType(order.orderType.toLowerCase());
    const side = order.side === 'buy' ? 'BUY' : 'SELL';
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
export function convertKrakenFuturesPosition(pos) {
    const direction = pos.side === 'short' ? 'SHORT' : 'LONG';
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
export function mapKrakenFuturesWsOrderType(type) {
    const normalized = type.replace(/_/g, '-');
    return mapKrakenOrderType(normalized);
}
export function convertKrakenFuturesWsOrder(order, isCancel = false, reason) {
    // console.log('Kraken raw order:', order);
    const side = order.direction === 0 ? 'BUY' : 'SELL';
    const orderType = mapKrakenFuturesWsOrderType(order.type);
    let status = 'NEW';
    if (isCancel && reason === 'full_fill')
        status = 'FILLED';
    else if (isCancel && reason === 'contract_expired')
        status = 'EXPIRED';
    else if (isCancel && isKrakenRejectedOrderReason(reason))
        status = 'REJECTED';
    else if (isCancel)
        status = 'CANCELED';
    else if (order.filled >= order.qty)
        status = 'FILLED';
    else if (order.filled > 0)
        status = 'PARTIALLY_FILLED';
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
function isKrakenRejectedOrderReason(reason) {
    return reason === 'not_enough_margin'
        || reason === 'ioc_order_failed_because_it_would_not_be_executed'
        || reason === 'post_order_failed_because_it_would_filled'
        || reason === 'would_execute_self'
        || reason === 'would_not_reduce_position'
        || reason === 'order_for_edit_not_found';
}
export function convertKrakenFuturesWsPosition(position) {
    const balance = position.balance ?? 0;
    const direction = balance < 0 ? 'SHORT' : 'LONG';
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
export function convertKrakenFuturesWsBalances(message) {
    const balances = [];
    for (const [asset, balance] of Object.entries(message.holding ?? {})) {
        balances.push({
            asset: asset.toUpperCase(),
            balance: String(balance),
            crossWalletBalance: String(balance),
            balanceChange: '0'
        });
    }
    for (const wallet of Object.values(message.futures ?? {})) {
        if (!wallet.unit || wallet.balance === undefined)
            continue;
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
export function toBookTickerFromTicker(message) {
    if (message.bid === undefined || message.ask === undefined)
        return undefined;
    return {
        symbol: message.product_id,
        bestBid: message.bid,
        bestBidQty: message.bid_size ?? 0,
        bestAsk: message.ask,
        bestAskQty: message.ask_size ?? 0
    };
}
export function toFundingFromTicker(message) {
    if (message.relative_funding_rate === undefined || message.next_funding_rate_time === undefined)
        return undefined;
    const nextTime = typeof message.next_funding_rate_time === 'string'
        ? Date.parse(message.next_funding_rate_time)
        : message.next_funding_rate_time;
    return {
        symbol: message.product_id,
        rate: message.relative_funding_rate,
        nextFundingTime: nextTime,
        interval: 1
    };
}
export function parseFuturesSymbolParts(symbol) {
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
export function mapKrakenFuturesInstrumentToExtractedInfo(instrument) {
    const symbol = instrument.symbol;
    const baseAsset = instrument.base ?? parseFuturesSymbolParts(symbol).base;
    const quoteAsset = instrument.quote ?? parseFuturesSymbolParts(symbol).quote;
    return {
        symbol,
        rawData: instrument,
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
export function toSpotBookTickerFromTicker(ticker) {
    return {
        symbol: ticker.symbol,
        bestBid: ticker.bid,
        bestBidQty: ticker.bid_qty,
        bestAsk: ticker.ask,
        bestAskQty: ticker.ask_qty
    };
}
