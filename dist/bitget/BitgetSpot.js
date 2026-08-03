import BitgetStreams from './BitgetStreams.js';
import { convertCandle, convertDepth, convertOrder, convertSpotAsset, convertSpotExchangeInfo, convertTrade, createOrderResponse, isBitgetCandle, isBitgetOrder, isBitgetOrderBook, isBitgetPlaceOrderResponse, isBitgetSpotAsset, isBitgetSpotSymbol, isBitgetTrade, toBitgetForce, toBitgetOrderType, toBitgetSide } from './converters.js';
export default class BitgetSpot extends BitgetStreams {
    async closeListenKey() {
        return this.formattedResponse({ data: 'Not applicable for Bitget V2' });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('spot', 'GET', '/api/v2/spot/public/symbols');
        if (res.success && res.data) {
            return this.formattedResponse({ data: convertSpotExchangeInfo(res.data.filter(isBitgetSpotSymbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('spot', 'GET', '/api/v2/spot/market/merge-depth', {
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data && isBitgetOrderBook(res.data)) {
            return this.formattedResponse({ data: convertDepth(params.symbol, res.data) });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget spot depth response' });
    }
    async getKlines(params) {
        const requestedLimit = Math.max(0, Math.floor(params.limit ?? 100));
        if (requestedLimit === 0)
            return this.formattedResponse({ data: [] });
        const maxWindowMs = 90 * 24 * 60 * 60 * 1000;
        const candlesByTimestamp = new Map();
        const rangeStart = params.startTime;
        const rangeEnd = params.endTime ?? Date.now();
        let pageEnd = rangeEnd;
        let previousOldestTimestamp;
        while (candlesByTimestamp.size < requestedLimit) {
            const pageStart = Math.max(rangeStart ?? Number.NEGATIVE_INFINITY, pageEnd - maxWindowMs);
            const query = {
                symbol: params.symbol,
                granularity: this.normalizeRestInterval(params.interval),
                startTime: pageStart,
                endTime: pageEnd,
                limit: Math.min(1000, requestedLimit - candlesByTimestamp.size)
            };
            const res = await this.publicRequest('spot', 'GET', '/api/v2/spot/market/candles', query);
            if (!res.success || !res.data) {
                return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget spot candles response' });
            }
            const page = res.data
                .filter(isBitgetCandle)
                .map(item => convertCandle(item, params.symbol))
                .filter(candle => candle.time >= (rangeStart ?? Number.NEGATIVE_INFINITY) && candle.time <= rangeEnd);
            if (page.length === 0)
                break;
            for (const candle of page)
                candlesByTimestamp.set(candle.time, candle);
            const oldestTimestamp = Math.min(...page.map(candle => candle.time));
            if (oldestTimestamp === previousOldestTimestamp || oldestTimestamp >= pageEnd)
                break;
            if (rangeStart !== undefined && oldestTimestamp <= rangeStart)
                break;
            previousOldestTimestamp = oldestTimestamp;
            pageEnd = oldestTimestamp - 1;
        }
        const candles = [...candlesByTimestamp.values()]
            .sort((left, right) => left.time - right.time)
            .slice(-requestedLimit);
        return this.formattedResponse({ data: candles });
    }
    async getAggTrades(params) {
        const res = await this.publicRequest('spot', 'GET', '/api/v2/spot/market/fills', {
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetTrade).map(item => convertTrade(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getFundingHistory(_params) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async getBalance() {
        const res = await this.signedRequest('spot', 'GET', '/api/v2/spot/account/assets');
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetSpotAsset).map(convertSpotAsset) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getPositionRisk() {
        return this.formattedResponse({ data: [] });
    }
    async getOpenPositions() {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async getOpenPositionBySymbol(_params) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async getOpenOrders(symbol) {
        const query = { limit: 100 };
        if (symbol)
            query.symbol = symbol;
        const res = await this.signedRequest('spot', 'GET', '/api/v2/spot/trade/unfilled-orders', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetOrder).map(convertOrder) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        return this.signedRequest('spot', 'POST', '/api/v2/spot/trade/cancel-symbol-order', {
            symbol: params.symbol
        });
    }
    async cancelOrderById(params) {
        return this.signedRequest('spot', 'POST', '/api/v2/spot/trade/cancel-order', {
            symbol: params.symbol,
            clientOid: params.clientOrderId
        });
    }
    async customOrder(orderInput) {
        const clientOid = this.createClientOid('bgs');
        const payload = {
            symbol: orderInput.symbol,
            side: toBitgetSide(orderInput.side),
            orderType: toBitgetOrderType(orderInput.type),
            force: toBitgetForce(orderInput.timeInForce),
            size: orderInput.quantity?.toString(),
            price: orderInput.price?.toString(),
            clientOid
        };
        const res = await this.signedRequest('spot', 'POST', '/api/v2/spot/trade/place-order', payload);
        if (res.success && res.data && isBitgetPlaceOrderResponse(res.data)) {
            return this.formattedResponse({
                data: createOrderResponse({
                    symbol: orderInput.symbol,
                    side: orderInput.side,
                    type: orderInput.type,
                    quantity: orderInput.quantity,
                    price: orderInput.price,
                    clientOid,
                    response: res.data,
                    timeInForce: orderInput.timeInForce
                })
            });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget spot place order response' });
    }
    async marketBuy(params) {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'MARKET', quantity: params.quantity });
    }
    async marketSell(params) {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'MARKET', quantity: params.quantity });
    }
    async limitBuy(params) {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }
    async limitSell(params) {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }
    async stopOrder(_params) {
        return this.formattedResponse({ errors: 'Bitget spot stop orders are not exposed through the unified spot interface yet' });
    }
    async stopMarketOrder(_params) {
        return this.formattedResponse({ errors: 'Bitget spot stop-market orders are not exposed through the unified spot interface yet' });
    }
    async reduceLimitOrder(_params) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async reducePosition(_params) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async trailingStopOrder(_params) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    async getLatestPnlBySymbol(_symbol) {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }
    createClientOid(prefix) {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }
    normalizeRestInterval(interval) {
        const map = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '4h': '4h',
            '1d': '1day',
            '1w': '1week'
        };
        return map[interval] ?? interval;
    }
}
