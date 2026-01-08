"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BybitStreams_js_1 = __importDefault(require("./BybitStreams.js"));
const converters_js_1 = require("./converters.js");
class BybitSpot extends BybitStreams_js_1.default {
    constructor(apiKey, apiSecret, isTest) {
        super(apiKey, apiSecret, isTest);
    }
    async closeListenKey() {
        return this.formattedResponse({ data: "Not applicable for Bybit V5" });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/instruments-info', { category: 'spot' });
        if (res.success && res.data) {
            const info = (0, converters_js_1.convertExchangeInfo)(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/orderbook', {
            category: 'spot',
            symbol: params.symbol,
            limit: params.limit || 50
        });
        if (res.success && res.data) {
            const data = res.data;
            const { s, b, a, u } = data;
            return this.formattedResponse({
                data: {
                    symbol: s,
                    bids: b,
                    asks: a,
                    lastUpdateId: parseInt(u || '0')
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getKlines(params) {
        let interval = params.interval;
        if (interval === '1m')
            interval = '1';
        if (interval === '5m')
            interval = '5';
        if (interval === '15m')
            interval = '15';
        if (interval === '30m')
            interval = '30';
        if (interval === '1h')
            interval = '60';
        if (interval === '4h')
            interval = '240';
        if (interval === '1d')
            interval = 'D';
        const query = {
            category: 'spot',
            symbol: params.symbol,
            interval: interval,
            limit: params.limit || 200
        };
        if (params.startTime)
            query.start = params.startTime;
        if (params.endTime)
            query.end = params.endTime;
        const res = await this.publicRequest('spot', 'GET', '/v5/market/kline', query);
        const data = res.data;
        if (res.success && data && data.list) {
            const klines = data.list.map((item) => (0, converters_js_1.convertBybitKline)(item, params.symbol));
            klines.reverse();
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getAggTrades(params) {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/recent-trade', {
            category: 'spot',
            symbol: params.symbol,
            limit: params.limit || 60
        });
        const data = res.data;
        if (res.success && data && data.list) {
            const trades = data.list.map((t) => ({
                symbol: params.symbol,
                id: 0,
                price: parseFloat(t.price),
                quantity: parseFloat(t.size),
                time: parseInt(t.time),
                isBuyer: t.side === 'Buy'
            }));
            return this.formattedResponse({ data: trades });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    // --- Private Methods ---
    async getBalance() {
        const res = await this.signedRequest('spot', 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
        const data = res.data;
        if (res.success && data && data.list && data.list[0]) {
            const wallet = data.list[0];
            const coins = wallet.coin || [];
            const balances = coins.map((c) => ({
                asset: c.coin,
                balance: c.walletBalance,
                crossWalletBalance: c.walletBalance,
                balanceChange: 0
            }));
            return this.formattedResponse({ data: balances });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getPositionRisk() {
        return this.formattedResponse({ data: [] });
    }
    async getOpenPositions() {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async getOpenPositionBySymbol(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async getOpenOrders(symbol) {
        const query = { category: 'spot', limit: 50 };
        if (symbol)
            query.symbol = symbol;
        const res = await this.signedRequest('spot', 'GET', '/v5/order/realtime', query);
        const data = res.data;
        if (res.success && data && data.list) {
            const orders = data.list.map(converters_js_1.convertBybitOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        return await this.signedRequest('spot', 'POST', '/v5/order/cancel-all', {
            category: 'spot',
            symbol: params.symbol
        });
    }
    async cancelOrderById(params) {
        const payload = {
            category: 'spot',
            symbol: params.symbol,
        };
        if (params.clientOrderId)
            payload.orderLinkId = params.clientOrderId;
        return await this.signedRequest('spot', 'POST', '/v5/order/cancel', payload);
    }
    // --- Order Execution ---
    async customOrder(orderInput) {
        const { symbol, side, type, quantity, price, timeInForce } = orderInput;
        const payload = {
            category: 'spot',
            symbol,
            side: side === 'BUY' ? 'Buy' : 'Sell',
            orderType: type === 'MARKET' ? 'Market' : 'Limit',
            qty: quantity?.toString(),
            timeInForce: timeInForce || 'GTC',
        };
        if (price)
            payload.price = price.toString();
        const res = await this.signedRequest('spot', 'POST', '/v5/order/create', payload);
        if (res.success && res.data) {
            return this.formattedResponse({
                data: {
                    orderId: res.data.orderId,
                    clientOrderId: res.data.orderLinkId,
                    symbol,
                    status: 'NEW',
                    price: price?.toString() || '0',
                    origQty: quantity?.toString() || '0',
                    executedQty: '0',
                    side: side,
                    type: type
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async marketBuy(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'MARKET',
            quantity: params.quantity
        });
    }
    async marketSell(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: params.quantity
        });
    }
    async limitBuy(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            timeInForce: 'GTC'
        });
    }
    async limitSell(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            timeInForce: 'GTC'
        });
    }
    async stopOrder(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async stopMarketOrder(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async reduceLimitOrder(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async reducePosition(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async trailingStopOrder(params) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
    async getLatestPnlBySymbol(symbol) {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
}
exports.default = BybitSpot;
