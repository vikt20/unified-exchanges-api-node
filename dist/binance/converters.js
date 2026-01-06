"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertObjectIntoUrlEncoded = convertObjectIntoUrlEncoded;
exports.extractInfo = extractInfo;
exports.convertDepthData = convertDepthData;
exports.convertKlineData = convertKlineData;
exports.convertUserData = convertUserData;
exports.convertAccountDataWebSocketRaw = convertAccountDataWebSocketRaw;
exports.convertOrderDataWebSocket = convertOrderDataWebSocket;
exports.convertAlgoOrderDataWebSocket = convertAlgoOrderDataWebSocket;
exports.convertOrderDataRequestResponse = convertOrderDataRequestResponse;
exports.convertPositionDataByRequest = convertPositionDataByRequest;
exports.convertPositionRiskDataByRequest = convertPositionRiskDataByRequest;
exports.convertPositionRiskToPositionData = convertPositionRiskToPositionData;
exports.convertBookTickerData = convertBookTickerData;
exports.convertKlinesDataByRequest = convertKlinesDataByRequest;
exports.convertTradeDataWebSocket = convertTradeDataWebSocket;
exports.convertAggTradesDataByRequest = convertAggTradesDataByRequest;
exports.convertAlgoOrderByRequest = convertAlgoOrderByRequest;
function convertObjectIntoUrlEncoded(obj) {
    return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
}
function extractInfo(data) {
    let info = {};
    for (let obj of data) {
        if (obj.status !== "TRADING")
            continue;
        let filters = { status: obj.status };
        for (let filter of obj.filters) {
            // filters.all = obj.filters
            if (filter.filterType == "MIN_NOTIONAL") {
                filters.minNotional = Number(filter.notional);
            }
            else if (filter.filterType == "NOTIONAL") {
                filters.minNotional = Number(filter.minNotional);
            }
            else if (filter.filterType == "PRICE_FILTER") {
                filters.minPrice = parseFloat(filter.minPrice);
                filters.maxPrice = parseFloat(filter.maxPrice);
                filters.tickSize = parseFloat(filter.tickSize);
            }
            else if (filter.filterType == "LOT_SIZE") {
                filters.stepSize = parseFloat(filter.stepSize);
                filters.minQty = parseFloat(filter.minQty);
                filters.maxQty = parseFloat(filter.maxQty);
            }
        }
        //filters.baseAssetPrecision = obj.baseAssetPrecision;
        //filters.quoteAssetPrecision = obj.quoteAssetPrecision;
        filters.orderTypes = obj.orderTypes;
        filters.baseAsset = obj.baseAsset;
        filters.quoteAsset = obj.quoteAsset;
        filters.icebergAllowed = obj.icebergAllowed;
        // filters.pair = obj.pair
        info[obj.symbol] = filters;
    }
    return info;
}
function convertDepthData(inputData) {
    const { s: symbol, a, b } = inputData.data;
    return {
        symbol,
        asks: a,
        bids: b
    };
}
function convertKlineData(inputData) {
    const { s: symbol, k } = inputData.data;
    return {
        symbol,
        time: k.t,
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
        trades: Number(k.n)
    };
}
function convertUserData(rawData) {
    let { e, o, a } = rawData;
    // console.log(rawData)
    if (e === "ACCOUNT_UPDATE") {
        return { event: e, orderData: undefined, accountData: convertAccountDataWebSocketRaw(a) };
    }
    else if (e === "ORDER_TRADE_UPDATE") {
        return { event: e, accountData: undefined, orderData: convertOrderDataWebSocket(o) };
    }
    else if (e === "ALGO_UPDATE") {
        return { event: "ORDER_TRADE_UPDATE", accountData: undefined, orderData: convertAlgoOrderDataWebSocket(o) };
    }
    else {
        return { event: e, accountData: undefined, orderData: undefined };
    }
}
function convertAccountDataWebSocketRaw(rawAccountData) {
    let { B: balancesRaw, P: positionsRaw } = rawAccountData;
    let balances = balancesRaw.map(balances => {
        let { a: asset, wb: balance, cw: crossWalletBalance, bc: balanceChange } = balances;
        return { asset, balance, crossWalletBalance, balanceChange };
    });
    let positions = positionsRaw.map(position => {
        let { s: symbol, pa: positionAmount, ep: entryPrice, cr: accumulatedRealized, up: unrealizedPnL, mt: marginType, iw: isolatedWallet, ps: positionSide } = position;
        return {
            symbol,
            positionAmount: parseFloat(positionAmount),
            entryPrice: parseFloat(entryPrice),
            positionDirection: (parseFloat(positionAmount) > 0) ? "LONG" : "SHORT",
            isInPosition: (parseFloat(positionAmount) !== 0),
            unrealizedPnL: parseFloat(unrealizedPnL),
        };
    });
    return { balances, positions };
}
;
function convertOrderDataWebSocket(rawData) {
    let { s: symbol, c: clientOrderId, 
    // special client order id:
    // starts with "autoclose-": liquidation order
    // "adl_autoclose": ADL auto close order
    S: side, o: orderType, f: timeInForce, q: originalQuantity, p: originalPrice, ap: averagePrice, sp: stopPrice, // please ignore with TRAILING_STOP_MARKET order,
    x: executionType, X: orderStatus, i: orderId, l: orderLastFilledQuantity, z: orderFilledAccumulatedQuantity, L: lastFilledPrice, N: commissionAsset, // will not push if no commission
    n: commission, // will not push if no commission
    T: orderTradeTime, t: tradeId, b: bidsNotional, a: askNotional, m: isMakerSide, // is this trade maker side
    R: isReduceOnly, // is this reduce only
    wt: workingType, ot: originalOrderType, ps: positionSide, cp: closeAll, // if close-all, pushed with conditional order
    AP: activationPrice, // only pushed with TRAILING_STOP_MARKET order
    cr: callbackRate, // only pushed with TRAILING_STOP_MARKET order
    rp: realizedProfit } = rawData;
    return {
        symbol,
        clientOrderId,
        side,
        orderType,
        timeInForce,
        originalQuantity: parseFloat(originalQuantity),
        originalPrice: parseFloat(originalPrice),
        averagePrice: parseFloat(averagePrice),
        stopPrice: parseFloat(stopPrice),
        executionType,
        orderStatus,
        orderId,
        orderLastFilledQuantity: parseFloat(orderLastFilledQuantity),
        orderFilledAccumulatedQuantity: parseFloat(orderFilledAccumulatedQuantity),
        lastFilledPrice: parseFloat(lastFilledPrice),
        commissionAsset,
        commission,
        orderTradeTime,
        tradeId,
        bidsNotional,
        askNotional,
        isMakerSide,
        isReduceOnly,
        workingType,
        originalOrderType,
        positionSide,
        closeAll,
        activationPrice,
        callbackRate,
        realizedProfit,
        isAlgoOrder: false
    };
}
function convertAlgoOrderDataWebSocket(rawData) {
    // console.log(`convertAlgoOrderDataWebSocket:`, rawData)
    let { caid: clientAlgoId, aid: algoId, at: algoType, o: orderType, s: symbol, S: side, ps: positionSide, f: timeInForce, q: quantity, X: algoStatus, ai: actualOrderId, ap: avgPrice, aq: executedQty, act: actualOrderType, tp: triggerPrice, p: price, V: stpMode, wt: workingType, pm: priceMatch, cp: closePosition, pP: priceProtect, R: reduceOnly, tt: triggerTime, gtd: goodTillDate, rm: rejectReason } = rawData;
    const res = {
        symbol,
        clientOrderId: clientAlgoId,
        side: side,
        orderType: orderType,
        timeInForce: timeInForce,
        originalQuantity: parseFloat(quantity),
        originalPrice: parseFloat(price),
        averagePrice: parseFloat(avgPrice),
        stopPrice: parseFloat(triggerPrice),
        executionType: algoStatus,
        orderStatus: algoStatus,
        orderId: algoId,
        orderLastFilledQuantity: parseFloat(executedQty),
        orderFilledAccumulatedQuantity: parseFloat(executedQty),
        lastFilledPrice: parseFloat(avgPrice),
        commissionAsset: '',
        commission: '',
        orderTradeTime: triggerTime,
        tradeId: 0,
        bidsNotional: '',
        askNotional: '',
        isMakerSide: false,
        isReduceOnly: reduceOnly,
        workingType: workingType,
        originalOrderType: orderType,
        positionSide: positionSide,
        closeAll: closePosition,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: true
    };
    // console.log(res)
    return res;
}
function convertOrderDataRequestResponse(rawData) {
    let { symbol, clientOrderId, side, type, timeInForce, origQty, price, avgPrice, stopPrice, status, orderId, executedQty, cumQuote, time, updateTime, reduceOnly, closePosition, positionSide, workingType, origType, priceMatch, selfTradePreventionMode, goodTillDate } = rawData;
    return {
        symbol,
        clientOrderId,
        side,
        orderType: type,
        timeInForce,
        originalQuantity: parseFloat(origQty),
        originalPrice: parseFloat(price),
        averagePrice: parseFloat(avgPrice || '0'),
        stopPrice: parseFloat(stopPrice || '0'),
        executionType: status,
        orderStatus: status,
        orderId,
        orderLastFilledQuantity: parseFloat(executedQty || '0'),
        orderFilledAccumulatedQuantity: parseFloat(cumQuote || '0'),
        lastFilledPrice: parseFloat(avgPrice || '0'),
        commissionAsset: '',
        commission: '',
        orderTradeTime: time || 0,
        tradeId: 0,
        isMakerSide: false,
        isReduceOnly: reduceOnly,
        workingType,
        originalOrderType: origType,
        positionSide,
        closeAll: closePosition,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: false
    };
}
function convertPositionDataByRequest(rawPositionData) {
    let { symbol, positionAmt, entryPrice, markPrice, unRealizedProfit, liquidationPrice, leverage, marginType, isolatedMargin, isAutoAddMargin, maxNotionalValue, positionSide } = rawPositionData;
    return {
        symbol,
        positionAmount: parseFloat(positionAmt),
        entryPrice: parseFloat(entryPrice),
        positionDirection: (parseFloat(positionAmt) > 0) ? "LONG" : "SHORT",
        isInPosition: (parseFloat(positionAmt) !== 0),
        unrealizedPnL: parseFloat(unRealizedProfit),
    };
}
function convertPositionRiskDataByRequest(rawPositionData) {
    return {
        symbol: rawPositionData.symbol,
        positionAmount: parseFloat(rawPositionData.positionAmt),
        entryPrice: parseFloat(rawPositionData.entryPrice),
        markPrice: parseFloat(rawPositionData.markPrice),
        unrealizedPnL: parseFloat(rawPositionData.unRealizedProfit),
        liquidationPrice: parseFloat(rawPositionData.liquidationPrice),
        leverage: parseInt(rawPositionData.leverage),
        marginType: rawPositionData.marginType.toLowerCase(),
        isolatedMargin: parseFloat(rawPositionData.isolatedMargin),
        positionSide: rawPositionData.positionSide,
        notionalValue: parseFloat(rawPositionData.notional),
        maxNotionalValue: parseFloat(rawPositionData.maxNotionalValue),
        isAutoAddMargin: rawPositionData.isAutoAddMargin === 'true',
        updateTime: rawPositionData.updateTime,
    };
}
function convertPositionRiskToPositionData(positionRisk) {
    return {
        symbol: positionRisk.symbol,
        positionAmount: positionRisk.positionAmount,
        entryPrice: positionRisk.entryPrice,
        positionDirection: (positionRisk.positionAmount > 0) ? "LONG" : "SHORT",
        isInPosition: positionRisk.positionAmount !== 0,
        unrealizedPnL: positionRisk.unrealizedPnL,
    };
}
function convertBookTickerData(rawData) {
    let { s: symbol, b: bestBid, B: bestBidQty, a: bestAsk, A: bestAskQty } = rawData.data;
    return { symbol, bestBid: parseFloat(bestBid), bestBidQty: parseFloat(bestBidQty), bestAsk: parseFloat(bestAsk), bestAskQty: parseFloat(bestAskQty) };
}
function convertKlinesDataByRequest(rawData, symbol) {
    return rawData.map(data => ({
        symbol, // Replace with actual symbol value
        time: data[0],
        open: parseFloat(data[1]),
        high: parseFloat(data[2]),
        low: parseFloat(data[3]),
        close: parseFloat(data[4]),
        volume: parseFloat(data[5]),
        trades: data[8] // Assuming number of trades is at index 8
    }));
}
function convertTradeDataWebSocket(rawData) {
    let { s: symbol, p: price, q: quantity, a: sellerOrderId, T: tradeTime, m: isBuyerMaker } = rawData.data;
    return { symbol, price: parseFloat(price), quantity: parseFloat(quantity), tradeTime, orderType: isBuyerMaker ? "SELL" : "BUY" };
}
function convertAggTradesDataByRequest(rawData, symbol) {
    return rawData.map(data => ({
        symbol,
        id: data.a,
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        time: data.T,
        isBuyer: data.m
    }));
}
function convertAlgoOrderByRequest(rawData) {
    let { algoId, clientAlgoId, orderType, symbol, side, positionSide, timeInForce, quantity, algoStatus, actualPrice, price, triggerPrice, workingType, closePosition, reduceOnly, createTime, updateTime } = rawData;
    return {
        symbol,
        clientOrderId: clientAlgoId,
        side: side,
        orderType: orderType,
        timeInForce: timeInForce,
        originalQuantity: parseFloat(quantity),
        originalPrice: parseFloat(price),
        averagePrice: parseFloat(actualPrice),
        stopPrice: parseFloat(triggerPrice),
        executionType: algoStatus,
        orderStatus: algoStatus,
        orderId: algoId,
        orderLastFilledQuantity: 0,
        orderFilledAccumulatedQuantity: 0,
        lastFilledPrice: parseFloat(actualPrice),
        commissionAsset: '',
        commission: '',
        orderTradeTime: createTime,
        tradeId: 0,
        isMakerSide: false,
        isReduceOnly: reduceOnly,
        workingType: workingType,
        originalOrderType: orderType,
        positionSide: positionSide,
        closeAll: closePosition,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: true
    };
}
