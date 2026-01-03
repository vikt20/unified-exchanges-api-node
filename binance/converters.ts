import { ExchangeInfo, ExtractedInfo, AccountData, OrderData, OrderRequestResponse, PositionData, PositionDirection, AggTradesData, AlgoOrderResponse, OrderSide, OrderType, TimeInForce, OrderStatus, OrderWorkingType, PositionSide } from './BinanceBase.js';
import { TradeData, TradeDataWebSocket, DepthData, KlineData, UserData, DepthDataWebSocket, KlineDataWebSocket, UserDataWebSocket, AccountDataWebSocket, OrderDataWebSocket, BookTickerDataWebSocket, BookTickerData, AlgoOrderDataWebSocket } from './BinanceStreams.js';
import { AggTradesDataByRequest, KlineDataByRequest, PositionDataByRequest } from './BinanceFutures.js';

export function convertObjectIntoUrlEncoded(obj: any) {
    return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
}

export function extractInfo(data: ExchangeInfo['symbols']) {
    let info: { [key: string]: ExtractedInfo } = {};
    for (let obj of data) {
        if (obj.status !== "TRADING") continue

        let filters: any = { status: obj.status };
        for (let filter of obj.filters) {
            // filters.all = obj.filters

            if (filter.filterType == "MIN_NOTIONAL") {
                filters.minNotional = Number(filter.notional);
            } else if (filter.filterType == "NOTIONAL") {
                filters.minNotional = Number(filter.minNotional);
            } else if (filter.filterType == "PRICE_FILTER") {
                filters.minPrice = parseFloat(filter.minPrice);
                filters.maxPrice = parseFloat(filter.maxPrice);
                filters.tickSize = parseFloat(filter.tickSize);
            } else if (filter.filterType == "LOT_SIZE") {
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
    return info
}

export function convertDepthData(inputData: DepthDataWebSocket): DepthData {
    const { s: symbol, a, b } = inputData.data;
    return {
        symbol,
        asks: a,
        bids: b
    }
}
export function convertKlineData(inputData: KlineDataWebSocket): KlineData {
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
    }

}

export function convertUserData(rawData: UserDataWebSocket): UserData {
    let { e, o, a } = rawData;
    // console.log(rawData)
    if (e === "ACCOUNT_UPDATE") {
        return { event: e, orderData: undefined, accountData: convertAccountDataWebSocketRaw(a!) };
    } else if (e === "ORDER_TRADE_UPDATE") {
        return { event: e, accountData: undefined, orderData: convertOrderDataWebSocket(o as OrderDataWebSocket) };
    } else if (e === "ALGO_UPDATE") {
        return { event: "ORDER_TRADE_UPDATE", accountData: undefined, orderData: convertAlgoOrderDataWebSocket(o as AlgoOrderDataWebSocket) };
    } else {
        return { event: e, accountData: undefined, orderData: undefined };
    }
}

export function convertAccountDataWebSocketRaw(rawAccountData: AccountDataWebSocket): AccountData {
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
            positionDirection: (parseFloat(positionAmount) > 0) ? "LONG" : "SHORT" as PositionDirection,
            isInPosition: (parseFloat(positionAmount) !== 0),
            unrealizedPnL: parseFloat(unrealizedPnL),
        };
    });
    return { balances, positions };
};
export function convertOrderDataWebSocket(rawData: OrderDataWebSocket): OrderData {
    let {
        s: symbol,
        c: clientOrderId,
        // special client order id:
        // starts with "autoclose-": liquidation order
        // "adl_autoclose": ADL auto close order
        S: side,
        o: orderType,
        f: timeInForce,
        q: originalQuantity,
        p: originalPrice,
        ap: averagePrice,
        sp: stopPrice, // please ignore with TRAILING_STOP_MARKET order,
        x: executionType,
        X: orderStatus,
        i: orderId,
        l: orderLastFilledQuantity,
        z: orderFilledAccumulatedQuantity,
        L: lastFilledPrice,
        N: commissionAsset, // will not push if no commission
        n: commission, // will not push if no commission
        T: orderTradeTime,
        t: tradeId,
        b: bidsNotional,
        a: askNotional,
        m: isMakerSide, // is this trade maker side
        R: isReduceOnly, // is this reduce only
        wt: workingType,
        ot: originalOrderType,
        ps: positionSide,
        cp: closeAll, // if close-all, pushed with conditional order
        AP: activationPrice, // only pushed with TRAILING_STOP_MARKET order
        cr: callbackRate, // only pushed with TRAILING_STOP_MARKET order
        rp: realizedProfit
    } = rawData;
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

export function convertAlgoOrderDataWebSocket(rawData: AlgoOrderDataWebSocket): OrderData {
    // console.log(`convertAlgoOrderDataWebSocket:`, rawData)
    let {
        caid: clientAlgoId,
        aid: algoId,
        at: algoType,
        o: orderType,
        s: symbol,
        S: side,
        ps: positionSide,
        f: timeInForce,
        q: quantity,
        X: algoStatus,
        ai: actualOrderId,
        ap: avgPrice,
        aq: executedQty,
        act: actualOrderType,
        tp: triggerPrice,
        p: price,
        V: stpMode,
        wt: workingType,
        pm: priceMatch,
        cp: closePosition,
        pP: priceProtect,
        R: reduceOnly,
        tt: triggerTime,
        gtd: goodTillDate,
        rm: rejectReason
    } = rawData

    const res = {
        symbol,
        clientOrderId: clientAlgoId,
        side: side as OrderSide,
        orderType: orderType as OrderType,
        timeInForce: timeInForce as TimeInForce,
        originalQuantity: parseFloat(quantity),
        originalPrice: parseFloat(price),
        averagePrice: parseFloat(avgPrice),
        stopPrice: parseFloat(triggerPrice),
        executionType: algoStatus,
        orderStatus: algoStatus as OrderStatus,
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
        workingType: workingType as OrderWorkingType,
        originalOrderType: orderType as OrderType,
        positionSide: positionSide as PositionSide,
        closeAll: closePosition,
        activationPrice: '',
        callbackRate: '',
        realizedProfit: '',
        isAlgoOrder: true
    };
    // console.log(res)
    return res;
}

export function convertOrderDataRequestResponse(rawData: OrderRequestResponse): OrderData {
    let {
        symbol,
        clientOrderId,
        side,
        type,
        timeInForce,
        origQty,
        price,
        avgPrice,
        stopPrice,
        status,
        orderId,
        executedQty,
        cumQuote,
        time,
        updateTime,
        reduceOnly,
        closePosition,
        positionSide,
        workingType,
        origType,
        priceMatch,
        selfTradePreventionMode,
        goodTillDate
    } = rawData;
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



export function convertPositionDataByRequest(rawPositionData: PositionDataByRequest): PositionData {
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

export function convertPositionRiskDataByRequest(rawPositionData: PositionDataByRequest): import('../core/types.js').PositionRiskData {
    return {
        symbol: rawPositionData.symbol,
        positionAmount: parseFloat(rawPositionData.positionAmt),
        entryPrice: parseFloat(rawPositionData.entryPrice),
        markPrice: parseFloat(rawPositionData.markPrice),
        unrealizedPnL: parseFloat(rawPositionData.unRealizedProfit),
        liquidationPrice: parseFloat(rawPositionData.liquidationPrice),
        leverage: parseInt(rawPositionData.leverage),
        marginType: rawPositionData.marginType.toLowerCase() as 'cross' | 'isolated',
        isolatedMargin: parseFloat(rawPositionData.isolatedMargin),
        positionSide: rawPositionData.positionSide as PositionSide,
        notionalValue: parseFloat(rawPositionData.notional),
        maxNotionalValue: parseFloat(rawPositionData.maxNotionalValue),
        isAutoAddMargin: rawPositionData.isAutoAddMargin === 'true',
        updateTime: rawPositionData.updateTime,
    };
}

export function convertPositionRiskToPositionData(positionRisk: import('../core/types.js').PositionRiskData): PositionData {
    return {
        symbol: positionRisk.symbol,
        positionAmount: positionRisk.positionAmount,
        entryPrice: positionRisk.entryPrice,
        positionDirection: (positionRisk.positionAmount > 0) ? "LONG" : "SHORT" as PositionDirection,
        isInPosition: positionRisk.positionAmount !== 0,
        unrealizedPnL: positionRisk.unrealizedPnL,
    };
}

export function convertBookTickerData(rawData: BookTickerDataWebSocket): BookTickerData {
    let { s: symbol, b: bestBid, B: bestBidQty, a: bestAsk, A: bestAskQty } = rawData.data;
    return { symbol, bestBid: parseFloat(bestBid), bestBidQty: parseFloat(bestBidQty), bestAsk: parseFloat(bestAsk), bestAskQty: parseFloat(bestAskQty) };
}

export function convertKlinesDataByRequest(rawData: KlineDataByRequest[], symbol: string): KlineData[] {
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

export function convertTradeDataWebSocket(rawData: TradeDataWebSocket): TradeData {
    let { s: symbol, p: price, q: quantity, a: sellerOrderId, T: tradeTime, m: isBuyerMaker } = rawData.data;
    return { symbol, price: parseFloat(price), quantity: parseFloat(quantity), tradeTime, orderType: isBuyerMaker ? "SELL" : "BUY" };
}

export function convertAggTradesDataByRequest(rawData: AggTradesDataByRequest[], symbol: string): AggTradesData[] {

    return rawData.map(data => ({
        symbol,
        id: data.a,
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        time: data.T,
        isBuyer: data.m
    }));
}


export function convertAlgoOrderByRequest(rawData: AlgoOrderResponse): OrderData {
    let {
        algoId,
        clientAlgoId,
        orderType,
        symbol,
        side,
        positionSide,
        timeInForce,
        quantity,
        algoStatus,
        actualPrice,
        price,
        triggerPrice,
        workingType,
        closePosition,
        reduceOnly,
        createTime,
        updateTime
    } = rawData;
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