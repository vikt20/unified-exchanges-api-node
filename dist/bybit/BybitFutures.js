import BybitStreams from "./BybitStreams.js";
import { convertBybitKline, convertBybitOrder, convertExchangeInfo } from "./converters.js";
export default class BybitFutures extends BybitStreams {
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
    }
    async closeListenKey() {
        return this.formattedResponse({ data: "Not applicable for Bybit V5" });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/instruments-info', { category: 'linear' });
        if (res.success && res.data) {
            const info = convertExchangeInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/orderbook', {
            category: 'linear',
            symbol: params.symbol,
            limit: params.limit || 1000
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
            const klines = data.list.map((item) => convertBybitKline(item, params.symbol));
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
                    positionSide: dir,
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
                positionAmount: p.positionSide === 'LONG' ? p.positionAmount : -p.positionAmount,
                entryPrice: p.entryPrice,
                positionDirection: p.positionSide,
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
        else
            query.settleCoin = 'USDT'; // Required for linear if symbol is not provided
        const res = await this.signedRequest('linear', 'GET', '/v5/order/realtime', query);
        const data = res.data;
        if (res.success && data && data.list) {
            const orders = data.list.map(convertBybitOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        return await this.signedRequest('linear', 'POST', '/v5/order/cancel-all', {
            category: 'linear',
            symbol: params.symbol
        });
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
        const { symbol, side, type, quantity, price, triggerPrice, timeInForce = 'GTC', reduceOnly = false, closePosition = false, workingType = 'CONTRACT_PRICE', triggerDirection } = orderInput;
        // Verify if we can construct a clientOrderID to track this order
        const orderLinkId = `bybit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const payload = {
            category: 'linear',
            symbol,
            side: side === 'BUY' ? 'Buy' : 'Sell',
            orderType: type.includes('MARKET') ? 'Market' : 'Limit',
            qty: quantity?.toString(),
            timeInForce: timeInForce,
            orderLinkId: orderLinkId, // Sent to Bybit to enable cancellation by clientOrderId
            reduceOnly: reduceOnly,
            closeOnTrigger: closePosition
        };
        if (price)
            payload.price = price.toString();
        if (triggerPrice) {
            payload.triggerPrice = triggerPrice.toString();
            if (workingType === 'MARK_PRICE')
                payload.triggerBy = 'MarkPrice';
            else if (workingType === 'CONTRACT_PRICE')
                payload.triggerBy = 'LastPrice';
            payload.tpslMode = 'Full';
            if (triggerDirection) {
                payload.triggerDirection = triggerDirection;
            }
            else {
                // Auto-detect trigger direction if not provided
                const prices = await this.getTickerPrice(symbol);
                if (prices) {
                    const refPrice = workingType === 'MARK_PRICE' ? prices.markPrice : prices.lastPrice;
                    // 1: Rise (Current < Trigger), 2: Fall (Current > Trigger)
                    payload.triggerDirection = triggerPrice > refPrice ? 1 : 2;
                }
            }
        }
        const res = await this.signedRequest('linear', 'POST', '/v5/order/create', payload);
        if (res.success && res.data) {
            const data = {
                orderId: res.data.orderId,
                symbol: symbol,
                status: 'NEW',
                clientOrderId: res.data.orderLinkId || orderLinkId,
                price: price?.toString() || '0',
                avgPrice: '0',
                origQty: quantity?.toString() || '0',
                executedQty: '0',
                cumQuote: '0',
                timeInForce: timeInForce,
                type: type,
                reduceOnly: reduceOnly,
                closePosition: closePosition,
                side: side,
                positionSide: 'BOTH',
                stopPrice: triggerPrice?.toString(),
                workingType: workingType,
                priceProtect: false,
                origType: type
            };
            return this.formattedResponse({
                data
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
    // Stop loss or take profit order
    async stopOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: params.quantity,
            price: params.price,
            triggerPrice: params.price,
            closePosition: true,
            triggerDirection: params.triggerDirection
        });
    }
    async stopMarketOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'MARKET',
            quantity: params.quantity,
            triggerPrice: params.price,
            triggerDirection: params.triggerDirection
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
        // Bybit V5 uses /v5/position/trading-stop to set a trailing stop on an existing position.
        // Unlike Binance's TRAILING_STOP_MARKET order type, this is a position-level operation.
        // callbackRate (percentage) must be converted to an absolute price distance (trailingStop).
        // Determine the trailing stop distance from callbackRate
        let trailingStopDistance;
        if (params.activatePrice) {
            // If an activation price is provided, calculate trailing distance from it
            trailingStopDistance = params.activatePrice * (params.callbackRate / 100);
        }
        else {
            // Fetch current price to calculate the absolute trailing stop distance
            const prices = await this.getTickerPrice(params.symbol);
            if (!prices) {
                return this.formattedResponse({ errors: "Failed to fetch current price for trailing stop calculation" });
            }
            trailingStopDistance = prices.lastPrice * (params.callbackRate / 100);
        }
        // positionIdx: 0 = one-way mode, 1 = hedge-mode Buy side (Long), 2 = hedge-mode Sell side (Short)
        // When closing a LONG position, the side is SELL → positionIdx 1 (long side)
        // When closing a SHORT position, the side is BUY → positionIdx 2 (short side)
        const positionIdx = params.side === 'SELL' ? 1 : 2;
        const payload = {
            category: 'linear',
            symbol: params.symbol,
            trailingStop: trailingStopDistance.toString(),
            positionIdx: 0,
            reduceOnly: true
        };
        if (params.activatePrice) {
            payload.activePrice = params.activatePrice.toString();
        }
        const res = await this.signedRequest('linear', 'POST', '/v5/position/trading-stop', payload);
        if (res.success) {
            // Bybit returns an empty result on success, so we construct a synthetic response
            const data = {
                orderId: 0, // No orderId for trailing stop position setting
                symbol: params.symbol,
                status: 'NEW',
                clientOrderId: `trailing-${Date.now()}`,
                price: '0',
                avgPrice: '0',
                origQty: params.quantity.toString(),
                executedQty: '0',
                cumQuote: '0',
                timeInForce: 'GTC',
                type: 'TRAILING_STOP_MARKET',
                reduceOnly: true,
                closePosition: false,
                side: params.side,
                positionSide: 'BOTH',
                stopPrice: params.activatePrice?.toString(),
                workingType: 'CONTRACT_PRICE',
                priceProtect: false,
                origType: 'TRAILING_STOP_MARKET'
            };
            return this.formattedResponse({ data });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getLatestPnlBySymbol(symbol) {
        const res = await this.signedRequest('linear', 'GET', '/v5/position/closed-pnl', {
            category: 'linear',
            symbol,
            limit: 1
        });
        if (res.success && res.data?.list?.length) {
            return this.formattedResponse({ data: parseFloat(res.data.list[0].closedPnl) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getTickerPrice(symbol) {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/tickers', {
            category: 'linear',
            symbol: symbol
        });
        if (res.success && res.data && res.data.list && res.data.list[0]) {
            const ticker = res.data.list[0];
            return {
                lastPrice: parseFloat(ticker.lastPrice),
                markPrice: parseFloat(ticker.markPrice)
            };
        }
        return null;
    }
}
