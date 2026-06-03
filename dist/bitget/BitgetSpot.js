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
        const query = {
            symbol: params.symbol,
            granularity: this.normalizeRestInterval(params.interval),
            limit: params.limit ?? 100
        };
        if (params.startTime !== undefined)
            query.startTime = params.startTime;
        if (params.endTime !== undefined)
            query.endTime = params.endTime;
        const res = await this.publicRequest('spot', 'GET', '/api/v2/spot/market/candles', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetCandle).map(item => convertCandle(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
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
