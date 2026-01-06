"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BybitStreams_1 = __importDefault(require("./BybitStreams"));
const converters_1 = require("./converters");
class BybitFutures extends BybitStreams_1.default {
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret);
    }
    async closeListenKey() {
        return this.formattedResponse({ data: "Not applicable for Bybit V5" });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/instruments-info', { category: 'linear' });
        if (res.success && res.data) {
            const info = (0, converters_1.convertExchangeInfo)(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/orderbook', {
            category: 'linear',
            symbol: params.symbol,
            limit: params.limit || 50
        });
        if (res.success && res.data) {
            const data = res.data;
            const { s, b, a, u } = data; // s: symbol, b: bids, a: asks
            return this.formattedResponse({
                data: {
                    symbol: s,
                    bids: b, // Bybit returns as [[price, size], ...] strings
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
            category: 'linear',
            symbol: params.symbol,
            interval: interval,
            limit: params.limit || 200
        };
        if (params.startTime)
            query.start = params.startTime;
        if (params.endTime)
            query.end = params.endTime;
        const res = await this.publicRequest('linear', 'GET', '/v5/market/kline', query);
        const data = res.data;
        if (res.success && data && data.list) {
            const klines = data.list.map((item) => (0, converters_1.convertBybitKline)(item, params.symbol));
            klines.reverse();
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getAggTrades(params) {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/recent-trade', {
            category: 'linear',
            symbol: params.symbol,
            limit: params.limit || 500
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
        const res = await this.signedRequest('linear', 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
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
        const res = await this.signedRequest('linear', 'GET', '/v5/position/list', { category: 'linear', settleCoin: 'USDT' });
        const data = res.data;
        if (res.success && data && data.list) {
            const result = data.list.map((p) => {
                let dir = 'LONG';
                if (p.side === 'Sell' || p.positionIdx === 2)
                    dir = 'SHORT';
                return {
                    symbol: p.symbol,
                    positionAmount: parseFloat(p.size),
                    entryPrice: parseFloat(p.avgPrice),
                    markPrice: parseFloat(p.markPrice),
                    unrealizedPnL: parseFloat(p.unrealisedPnl),
                    liquidationPrice: parseFloat(p.liqPrice),
                    leverage: parseFloat(p.leverage),
                    marginType: p.tradeMode === 1 ? 'isolated' : 'cross',
                    isolatedMargin: parseFloat(p.positionBalance),
                    positionSide: dir === 'LONG' ? 'LONG' : 'SHORT',
                    notionalValue: parseFloat(p.positionValue),
                    maxNotionalValue: 0,
                    isAutoAddMargin: p.autoAddMargin === 1,
                    updateTime: parseInt(p.updatedTime)
                };
            });
            return this.formattedResponse({ data: result });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenPositions() {
        const riskRes = await this.getPositionRisk();
        if (riskRes.success && riskRes.data) {
            const positions = riskRes.data
                .filter((p) => p.positionAmount !== 0)
                .map((p) => ({
                symbol: p.symbol,
                positionAmount: p.positionAmount,
                entryPrice: p.entryPrice,
                positionDirection: (p.positionAmount > 0 ? "LONG" : "SHORT"),
                isInPosition: true,
                unrealizedPnL: p.unrealizedPnL
            }));
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: riskRes.errors });
    }
    async getOpenPositionBySymbol(params) {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            const pos = res.data.find(p => p.symbol === params.symbol);
            if (pos)
                return this.formattedResponse({ data: pos });
            return this.formattedResponse({ errors: "Position not found" });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrders(symbol) {
        const query = { category: 'linear', limit: 50 };
        if (symbol)
            query.symbol = symbol;
        const res = await this.signedRequest('linear', 'GET', '/v5/order/realtime', query);
        const data = res.data;
        if (res.success && data && data.list) {
            const orders = data.list.map(converters_1.convertBybitOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        const res = await this.signedRequest('linear', 'POST', '/v5/order/cancel-all', {
            category: 'linear',
            symbol: params.symbol
        });
        return res;
    }
    async cancelOrderById(params) {
        const payload = {
            category: 'linear',
            symbol: params.symbol,
        };
        if (params.clientOrderId)
            payload.orderLinkId = params.clientOrderId;
        return await this.signedRequest('linear', 'POST', '/v5/order/cancel', payload);
    }
    // --- Order Execution ---
    async customOrder(orderInput) {
        const { symbol, side, type, quantity, price, triggerPrice, timeInForce, reduceOnly, closePosition, workingType } = orderInput;
        const payload = {
            category: 'linear',
            symbol,
            side: side === 'BUY' ? 'Buy' : 'Sell',
            orderType: type === 'MARKET' ? 'Market' : 'Limit',
            qty: quantity?.toString(),
            timeInForce: timeInForce || 'GTC',
        };
        if (price)
            payload.price = price.toString();
        if (reduceOnly)
            payload.reduceOnly = true;
        if (triggerPrice) {
            payload.triggerPrice = triggerPrice.toString();
            if (workingType === 'MARK_PRICE')
                payload.triggerBy = 'MarkPrice';
            else if (workingType === 'CONTRACT_PRICE')
                payload.triggerBy = 'LastPrice';
        }
        const res = await this.signedRequest('linear', 'POST', '/v5/order/create', payload);
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
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
        });
    }
    async marketSell(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
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
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: undefined,
            price: params.price,
            triggerPrice: params.price,
            closePosition: true
        });
    }
    async stopMarketOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'MARKET',
            quantity: params.quantity,
            triggerPrice: params.price,
            reduceOnly: true
        });
    }
    async reduceLimitOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            reduceOnly: true
        });
    }
    async reducePosition(params) {
        const side = params.positionDirection === 'LONG' ? 'SELL' : 'BUY';
        return this.customOrder({
            symbol: params.symbol,
            side: side,
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: true
        });
    }
    async trailingStopOrder(params) {
        return this.formattedResponse({ errors: "Trailing Stop Order not fully supported in Bybit V5 wrapper yet" });
    }
    async getLatestPnlBySymbol(symbol) {
        const res = await this.signedRequest('linear', 'GET', '/v5/execution/list', {
            category: 'linear',
            symbol: symbol,
            limit: 100
        });
        if (res.success && res.data && res.data.list) {
            const total = res.data.list.reduce((acc, curr) => acc + parseFloat(curr.closedPnl || '0'), 0);
            return this.formattedResponse({ data: total });
        }
        return this.formattedResponse({ errors: res.errors });
    }
}
exports.default = BybitFutures;
