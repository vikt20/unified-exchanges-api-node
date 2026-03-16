import {
    KlineData,
    OrderData,
    PositionData,
    OrderStatus,
    OrderSide,
    OrderType,
    TimeInForce,
    PositionDirection,
    ExtractedInfo,
    OrderWorkingType
} from '../core/types.js';

// --- OKX REST Types ---

export function convertExchangeInfo(data: any): { [key: string]: ExtractedInfo } {
    const info: { [key: string]: ExtractedInfo } = {};
    if (data && Array.isArray(data)) {
        for (const item of data) {
            info[item.instId] = {
                symbol: item.instId,
                status: item.state === 'live' ? 'TRADING' : 'BREAK',
                baseAsset: item.baseCcy || item.settleCcy,
                quoteAsset: item.quoteCcy || item.settleCcy,
                minPrice: parseFloat(item.tickSz || '0'),
                maxPrice: 0, // OKX does not specify max price explicitly in typical API response
                tickSize: parseFloat(item.tickSz || '0'),
                stepSize: parseFloat(item.lotSz || '0'),
                minQty: parseFloat(item.minSz || '0'),
                maxQty: 0,
                minNotional: 0,
                orderTypes: ['LIMIT', 'MARKET', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT'],
            };
        }
    }
    return info;
}

export function convertOkxKline(item: string[], symbol: string): KlineData {
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

export function mapOkxOrderType(ordType: string): OrderType {
    if (ordType === 'market') return 'MARKET';
    if (ordType === 'limit') return 'LIMIT';
    if (ordType === 'conditional') return 'STOP';
    if (ordType === 'trigger') return 'STOP_MARKET';
    return 'LIMIT'; // Default
}

export function convertOkxOrder(item: any): OrderData {
    let status: OrderStatus = 'NEW';
    const state = item.state;
    if (state === 'live') status = 'NEW';
    else if (state === 'canceled') status = 'CANCELED';
    else if (state === 'partially_filled') status = 'PARTIALLY_FILLED';
    else if (state === 'filled') status = 'FILLED';
    else if (state === 'mmp_canceled') status = 'CANCELED';

    // Algo orders usually have a different state
    if (item.actualOrder || item.ordType === 'conditional' || item.ordType === 'trigger') {
        if (state === 'effective') status = 'TRIGGERED';
        else if (state === 'canceled' || state === 'order_failed') status = 'CANCELED';
        else if (state === 'live') status = 'NEW';
    }

    const side: OrderSide = item.side?.toUpperCase() as OrderSide || 'BUY';

    let positionSide: "LONG" | "SHORT" | "BOTH" = "BOTH";
    if (item.posSide === 'long') positionSide = "LONG";
    else if (item.posSide === 'short') positionSide = "SHORT";

    return {
        symbol: item.instId,
        clientOrderId: item.clOrdId || item.algoClOrdId || item.ordId || item.algoId,
        side: side,
        orderType: mapOkxOrderType(item.ordType),
        timeInForce: 'GTC', // Mapping may be required
        originalQuantity: parseFloat(item.sz || '0'),
        originalPrice: parseFloat(item.px || '0'),
        averagePrice: parseFloat(item.avgPx || '0'),
        stopPrice: parseFloat(item.triggerPx || item.slTriggerPx || item.tpTriggerPx || '0'),
        executionType: status,
        orderStatus: status,
        orderId: item.ordId || item.algoId,
        orderLastFilledQuantity: parseFloat(item.fillSz || '0'),
        orderFilledAccumulatedQuantity: parseFloat(item.accFillSz || '0'),
        lastFilledPrice: parseFloat(item.fillPx || '0'),
        commissionAsset: item.feeCcy || '',
        commission: parseFloat(item.fee || '0').toString(),
        orderTradeTime: parseInt(item.uTime || item.cTime),
        tradeId: 0,
        isMakerSide: item.execType === 'M',
        isReduceOnly: item.reduceOnly === 'true',
        workingType: 'CONTRACT_PRICE', // Default
        originalOrderType: mapOkxOrderType(item.ordType),
        positionSide: positionSide,
        closeAll: item.closeFraction === '1',
        activationPrice: item.triggerPx,
        callbackRate: '',
        realizedProfit: item.pnl || '0',
        isAlgoOrder: !!item.algoId
    };
}

export function convertOkxPosition(item: any): PositionData {
    const size = parseFloat(item.pos);
    let direction: PositionDirection = 'LONG';
    if (item.posSide === 'net') {
        direction = size >= 0 ? 'LONG' : 'SHORT';
    } else if (item.posSide === 'short') {
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

export interface OkxWsMessage {
    arg?: {
        channel: string;
        instId?: string;
        instType?: string;
    };
    action?: string;
    data?: any[];
    event?: string;
    code?: string;
    msg?: string;
}

export interface OkxDepthWsData {
    bids: [string, string, string, string][];
    asks: [string, string, string, string][];
    ts: string;
    checksum: number;
}
