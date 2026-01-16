import {
    KlineData,
    OrderData,
    PositionData,
    OrderStatus,
    OrderSide,
    OrderType,
    TimeInForce,
    PositionDirection,
    ExchangeInfoData,
    SymbolInfo,
    OrderWorkingType,
    ExtractedInfo
} from '../core/types.js';

// --- WebSocket Types ---

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
export type BybitStopOrderType = 'TakeProfit' | 'StopLoss' | 'TrailingStop' | 'Stop' | 'PartialTakeProfit' | 'PartialStopLoss' | 'tpslOrder' | 'OcoOrder' | 'MmRateClose' | 'BidirectionalTpslOrder';
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

    stopOrderType: BybitStopOrderType;
}

export interface BybitPositionWsData {
    category: string;
    symbol: string;
    side: BybitSide; // Buy=Long, Sell=Short (One-Way Mode uses Buy for Long, Sell for Short; Hedge Mode: side identifies position)
    size: string;
    positionIdx: 0 | 1 | 2; // 0: One-Way Mode, 1: Buy Side, 2: Sell Side
    tradeMode: number;
    positionValue: string;
    riskId: number;
    riskLimitValue: string;
    entryPrice: string;
    markPrice: string;
    leverage: string;
    positionBalance: string;
    autoAddMargin: number; // 0 or 1
    liqPrice: string;
    bustPrice: string;
    tpSlMode: string;
    takeProfit: string;
    stopLoss: string;
    trailingStop: string;
    unrealisedPnl: string;
    cumRealisedPnl: string;
    positionStatus: string; // Normal, Liq, Adl
    adlRankIndicator: number;
    createdTime: string;
    updatedTime: string;
    avgPrice: string; // Not always present in WebSocket, sometimes only in Rest API? API checks confirmed avgPrice exists in some contexts
}

export interface BybitWalletCoinData {
    coin: string;
    equity: string;
    usdValue: string;
    walletBalance: string;
    availableToWithdraw: string;
    availableToBorrow: string;
    borrowAmount: string; // total borrowing amount
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

export function convertExchangeInfo(data: any): { [key: string]: ExtractedInfo } {
    const info: { [key: string]: ExtractedInfo } = {};
    if (data && Array.isArray(data.list)) {
        for (const item of data.list) {
            info[item.symbol] = {
                symbol: item.symbol,
                status: item.status === 'Trading' ? 'TRADING' : 'BREAK',
                baseAsset: item.baseCoin,
                quoteAsset: item.quoteCoin,
                minPrice: parseFloat(item.priceFilter?.minPrice || '0'),
                maxPrice: parseFloat(item.priceFilter?.maxPrice || '0'),
                tickSize: parseFloat(item.priceFilter?.tickSize || '0'),
                stepSize: parseFloat(item.lotSizeFilter?.qtyStep || '0'),
                minQty: parseFloat(item.lotSizeFilter?.minOrderQty || '0'),
                maxQty: parseFloat(item.lotSizeFilter?.maxOrderQty || '0'),
                minNotional: parseFloat(item.lotSizeFilter?.minNotionalValue || '0'),
                orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'],
            };
        }
    }
    return info;
}

// Bybit V5 Response Types (Partial)
export interface BybitParams {
    category: 'spot' | 'linear' | 'inverse' | 'option';
    [key: string]: any;
}

export function convertObjectIntoUrlEncoded(obj: any) {
    return Object.keys(obj).map(k => {
        if (Array.isArray(obj[k])) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(JSON.stringify(obj[k]))
        }
        return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
    }).join('&');
}



// --- New Bybit Data Types ---
export interface BybitDepthWsData {
    s: string; // Symbol
    b: [string, string][]; // Bids
    a: [string, string][]; // Asks
    u: number; // Update ID
    seq: number; // Sequence
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

export function convertBybitFunding(item: BybitTickerWsData): import('../core/types.js').FundingData {
    return {
        symbol: item.symbol,
        rate: parseFloat(item.fundingRate),
        nextFundingTime: parseInt(item.nextFundingTime),
        interval: parseInt(item.fundingIntervalHour)
    };
}

export interface BybitTradeWsData {
    T: number; // Timestamp
    s: string; // Symbol
    S: BybitSide; // Side
    v: string; // Volume
    p: string; // Price
    L: string; // Tick direction
    i: string; // Trade ID
    BT: boolean; // Block trade
}

// --- Helpers ---

export function mapBybitTriggerBy(triggerBy: string): OrderWorkingType {
    if (triggerBy === 'MarkPrice') return 'MARK_PRICE';
    // Map LastPrice and IndexPrice (fallback) to CONTRACT_PRICE
    return 'CONTRACT_PRICE';
}

// --- Converters ---

export function convertBybitKline(item: string[], symbol: string): KlineData {
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

export function mapBybitOrderType(bybitOrder: BybitOrderWsData): OrderType {
    const isConditional =
        !!bybitOrder.triggerPrice && bybitOrder.closeOnTrigger === true;

    if (isConditional) {
        const isStopLoss =
            (bybitOrder.side === 'Sell' && bybitOrder.triggerDirection === 2) ||
            (bybitOrder.side === 'Buy' && bybitOrder.triggerDirection === 1);

        const isTakeProfit =
            (bybitOrder.side === 'Sell' && bybitOrder.triggerDirection === 1) ||
            (bybitOrder.side === 'Buy' && bybitOrder.triggerDirection === 2);

        if (isStopLoss) {
            return bybitOrder.orderType === 'Limit'
                ? 'LIMIT'
                : 'STOP_MARKET';
        }

        if (isTakeProfit) {
            return bybitOrder.orderType === 'Limit'
                ? 'TAKE_PROFIT_LIMIT'
                : 'TAKE_PROFIT_MARKET';
        }
    }

    // Non-conditional
    if (bybitOrder.orderType === 'Market' && bybitOrder.triggerPrice) return 'STOP';
    if (bybitOrder.orderType === 'Limit') return 'LIMIT';
    if (bybitOrder.orderType === 'Market') return 'MARKET';

    return bybitOrder.orderType as OrderType;
}

export function convertBybitOrder(item: any): OrderData {
    // Map Bybit status to unified OrderStatus
    let status: OrderStatus = 'NEW';
    if (item.orderStatus === 'New') status = 'NEW';
    else if (item.orderStatus === 'PartiallyFilled') status = 'PARTIALLY_FILLED';
    else if (item.orderStatus === 'Filled') status = 'FILLED';
    else if (item.orderStatus === 'Cancelled') status = 'CANCELED';
    else if (item.orderStatus === 'Rejected') status = 'REJECTED';
    else if (item.orderStatus === 'Untriggered') status = 'NEW'; // Conditional order waiting
    else if (item.orderStatus === 'Triggered') status = 'NEW';

    return {
        symbol: item.symbol,
        clientOrderId: item.orderLinkId || item.orderId,
        side: item.side.toUpperCase() as OrderSide,
        orderType: mapBybitOrderType(item) as OrderType,
        timeInForce: item.timeInForce as TimeInForce,
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
        originalOrderType: mapBybitOrderType(item) as OrderType,
        positionSide: item.positionIdx === 1 ? 'LONG' : (item.positionIdx === 2 ? 'SHORT' : 'BOTH'),
        closeAll: false,
        activationPrice: item.triggerPrice,
        callbackRate: '',
        realizedProfit: '', // Bybit gives this in closed PnL usually
        isAlgoOrder: false
    };
}

export function convertBybitPosition(item: any): PositionData {
    const size = parseFloat(item.size);
    // positionIdx: 0=One-Way, 1=Buy side of Hedge, 2=Sell side of Hedge
    let direction: PositionDirection = 'LONG';
    if (item.positionIdx === 2) direction = 'SHORT';
    else if (item.side === 'Sell') direction = 'SHORT'; // Fallback for One-Way

    return {
        symbol: item.symbol,
        positionAmount: size,
        entryPrice: parseFloat(item.avgPrice || '0'),
        positionDirection: direction,
        isInPosition: size > 0,
        unrealizedPnL: parseFloat(item.unrealisedPnl || '0')
    };
}
