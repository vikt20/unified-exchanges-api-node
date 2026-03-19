import OkxStreams from "./OkxStreams.js";
import { convertExchangeInfo, convertOkxKline, convertOkxOrder } from "./converters.js";
export default class OkxFutures extends OkxStreams {
    constructor(apiKey, apiSecret, apiPassphrase, isTest = false) {
        super(apiKey, apiSecret, apiPassphrase, isTest);
    }
    async closeListenKey() {
        return this.formattedResponse({ data: "Not applicable for OKX V5" });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('public', 'GET', '/api/v5/public/instruments', { instType: 'SWAP' });
        if (res.success && res.data) {
            const info = convertExchangeInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/books', {
            instId: params.symbol,
            sz: params.limit || 400
        });
        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const data = res.data[0];
            return this.formattedResponse({
                data: {
                    symbol: params.symbol,
                    bids: data.bids.map((b) => [b[0], b[1]]),
                    asks: data.asks.map((a) => [a[0], a[1]]),
                    lastUpdateId: parseInt(data.ts || '0')
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getKlines(params) {
        // Map interval to OKX bar: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M, 3M, 6M, 1Y
        let bar = this.normalizeOkxInterval(params.interval);
        const query = {
            instId: params.symbol,
            bar: bar,
            limit: params.limit || 1000
        };
        // OKX uses after/before in ms for pagination
        if (params.startTime)
            query.before = params.startTime;
        if (params.endTime)
            query.after = params.endTime;
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/candles', query);
        if (res.success && res.data && Array.isArray(res.data)) {
            const klines = res.data.map((item) => convertOkxKline(item, params.symbol));
            klines.reverse(); // Standardize chronological order
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getAggTrades(params) {
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/trades', {
            instId: params.symbol,
            limit: params.limit || 100
        });
        if (res.success && res.data && Array.isArray(res.data)) {
            const trades = res.data.map((t) => ({
                symbol: params.symbol,
                id: parseInt(t.tradeId),
                price: parseFloat(t.px),
                quantity: parseFloat(t.sz),
                time: parseInt(t.ts),
                isBuyer: t.side === 'buy'
            }));
            return this.formattedResponse({ data: trades });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    // --- Private Methods ---
    async getBalance() {
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/balance');
        if (res.success && res.data && Array.isArray(res.data) && res.data[0] && res.data[0].details) {
            const details = res.data[0].details;
            const balances = details.map((c) => ({
                asset: c.ccy,
                balance: c.eq,
                crossWalletBalance: c.eq,
                balanceChange: '0'
            }));
            return this.formattedResponse({ data: balances });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getPositionRisk() {
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/positions', { instType: 'SWAP' });
        if (res.success && res.data && Array.isArray(res.data)) {
            const result = res.data.map((p) => {
                let dir = "LONG";
                if (p.posSide === "net") {
                    dir = parseFloat(p.pos) >= 0 ? "LONG" : "SHORT";
                }
                else if (p.posSide === "short") {
                    dir = "SHORT";
                }
                const positionContracts = Math.abs(parseFloat(p.pos));
                const positionAmount = this.convertContractsToAssetSize(p.instId, positionContracts) ?? positionContracts;
                return {
                    symbol: p.instId,
                    positionAmount: positionAmount,
                    entryPrice: parseFloat(p.avgPx),
                    markPrice: parseFloat(p.markPx),
                    unrealizedPnL: parseFloat(p.upl),
                    liquidationPrice: parseFloat(p.liqPx || '0'),
                    leverage: parseFloat(p.lever),
                    marginType: p.mgnMode, // isolated or cross
                    isolatedMargin: parseFloat(p.margin),
                    positionSide: dir,
                    notionalValue: parseFloat(p.notionalUsd || '0'),
                    maxNotionalValue: 0,
                    isAutoAddMargin: p.autoMgId === 'true',
                    updateTime: parseInt(p.uTime)
                };
            });
            return this.formattedResponse({ data: result });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenPositions() {
        await this.assertInstrumentsReady();
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
        await this.assertInstrumentsReady();
        const query = { instType: 'SWAP' };
        if (symbol)
            query.instId = symbol;
        const resNormal = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', query);
        const resAlgo = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-algo-pending', { query, ...{ ordType: 'conditional' } });
        let merged = [];
        if (resNormal.success && resNormal.data)
            merged = merged.concat(resNormal.data);
        if (resAlgo.success && resAlgo.data)
            merged = merged.concat(resAlgo.data);
        if (resNormal.success && resAlgo.success) {
            const orders = merged.map(convertOkxOrder).map(o => ({
                ...o,
                originalQuantity: this.convertContractsToAssetSize(o.symbol, o.originalQuantity) ?? o.originalQuantity,
                orderLastFilledQuantity: this.convertContractsToAssetSize(o.symbol, o.orderLastFilledQuantity) ?? o.orderLastFilledQuantity,
                orderFilledAccumulatedQuantity: this.convertContractsToAssetSize(o.symbol, o.orderFilledAccumulatedQuantity) ?? o.orderFilledAccumulatedQuantity
            }));
            return this.formattedResponse({ data: orders });
        }
        const allErrors = `${resNormal.errors ? 'Orders normal: ' + resNormal.errors : ''} ${resAlgo.errors ? 'Orders algo: ' + resAlgo.errors : ''}`;
        return this.formattedResponse({ errors: allErrors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        const [pendingRes, algoRes] = await Promise.all([
            this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', { instId: params.symbol }),
            this.signedRequest('private', 'GET', '/api/v5/trade/orders-algo-pending', { instId: params.symbol, instType: 'SWAP' })
        ]);
        if ((!pendingRes.success || !pendingRes.data?.length) && (!algoRes.success || !algoRes.data?.length)) {
            return this.formattedResponse({ data: [] });
        }
        const cancelPayloads = (pendingRes.data || []).map((order) => ({
            instId: params.symbol,
            ordId: order.ordId
        }));
        const algoCancelPayloads = (algoRes.data || []).map((order) => ({
            instId: params.symbol,
            algoId: order.algoId
        }));
        const chunkSize = 20;
        const chunks = [];
        const algoChunks = [];
        for (let i = 0; i < cancelPayloads.length; i += chunkSize) {
            chunks.push(cancelPayloads.slice(i, i + chunkSize));
        }
        for (let i = 0; i < algoCancelPayloads.length; i += chunkSize) {
            algoChunks.push(algoCancelPayloads.slice(i, i + chunkSize));
        }
        const results = [];
        for (const chunk of chunks) {
            const res = await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-batch-orders', chunk);
            if (res.success)
                results.push(...res.data);
        }
        for (const chunk of algoChunks) {
            const res = await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-algos', chunk);
            if (res.success)
                results.push(...res.data);
        }
        return this.formattedResponse({ data: results });
    }
    async cancelOrderById(params) {
        if (!params.clientOrderId) {
            return this.formattedResponse({ errors: 'order ID is required' });
        }
        const payload = {
            instId: params.symbol,
        };
        if (params.isAlgoOrder) {
            const algoPayload = [{ instId: params.symbol, algoId: params.clientOrderId }];
            return await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-algos', algoPayload);
        }
        payload.ordId = params.clientOrderId;
        return await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-order', payload);
    }
    // --- Order Execution ---
    async customOrder(orderInput) {
        const { symbol, side, type, quantity, price, triggerPrice, reduceOnly = false, workingType = 'CONTRACT_PRICE' } = orderInput;
        this.assertInstrumentsReady();
        const contractSize = this.convertAssetSizeToContracts(symbol, quantity);
        // const clOrdId = `okx-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;
        const clOrdId = undefined;
        let endpoint = '/api/v5/trade/order';
        const payload = {
            instId: symbol,
            tdMode: 'cross', // Simplification: assuming cross mode for single-currency accounts
            side: side.toLowerCase(),
            sz: contractSize?.toString()
        };
        payload.reduceOnly = reduceOnly;
        if (type.includes('MARKET')) {
            payload.ordType = 'market';
        }
        else {
            payload.ordType = 'limit';
            if (price)
                payload.px = price.toString();
        }
        if (triggerPrice) {
            // Algo order
            endpoint = '/api/v5/trade/order-algo';
            payload.ordType = 'conditional';
            payload.algoClOrdId = clOrdId;
            delete payload.clOrdId;
            // default to Last price (CONTRACT_PRICE)
            let triggerPxType = 'last';
            if (workingType === 'MARK_PRICE')
                triggerPxType = 'mark';
            const isTakeProfit = type.includes('TAKE_PROFIT');
            const isStop = type.includes('STOP') || type.includes('STOP_LOSS');
            const isExitOrder = reduceOnly || orderInput.closePosition === true;
            if (isExitOrder && (isTakeProfit || isStop)) {
                payload.reduceOnly = true;
                if (isTakeProfit) {
                    payload.tpTriggerPx = triggerPrice.toString();
                    payload.tpTriggerPxType = triggerPxType;
                    payload.tpOrdPx = '-1'; // market
                }
                else {
                    payload.slTriggerPx = triggerPrice.toString();
                    payload.slTriggerPxType = triggerPxType;
                    payload.slOrdPx = '-1'; // market
                }
            }
            else {
                // For STOP orders (trigger market entry)
                // trigger algo orders require triggerPx/orderPx for entry triggers
                payload.ordType = 'trigger';
                payload.triggerPx = triggerPrice.toString();
                payload.triggerPxType = triggerPxType;
                if (type.includes('STOP')) {
                    payload.orderPx = '-1'; // market
                }
                else if (price) {
                    payload.orderPx = price.toString();
                }
            }
        }
        else {
            payload.clOrdId = clOrdId;
        }
        const res = await this.signedRequest('private', 'POST', endpoint, payload);
        console.log(`Raw order response:`, res);
        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const orderRes = res.data[0];
            const normalizedType = triggerPrice && !reduceOnly && orderInput.closePosition !== true && type === 'MARKET'
                ? 'STOP_MARKET'
                : type;
            const data = {
                orderId: orderRes.ordId || orderRes.algoId,
                symbol: symbol,
                status: 'NEW',
                clientOrderId: orderRes.clOrdId || orderRes.ordId || orderRes.algoClOrdId || clOrdId,
                price: price?.toString() || '0',
                avgPrice: '0',
                origQty: quantity?.toString() || '0',
                executedQty: '0',
                cumQuote: '0',
                timeInForce: 'GTC',
                type: normalizedType,
                reduceOnly: reduceOnly,
                closePosition: false,
                side: side,
                positionSide: 'BOTH',
                stopPrice: triggerPrice?.toString(),
                workingType: workingType,
                priceProtect: false,
                origType: normalizedType
            };
            return this.formattedResponse({ data });
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
            quantity: params.quantity,
            price: params.price,
            triggerPrice: params.price,
            closePosition: true,
            reduceOnly: true
        });
    }
    async stopMarketOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'STOP',
            quantity: params.quantity,
            triggerPrice: params.price
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
        const payload = {
            instId: params.symbol,
            mgnMode: 'cross',
            posSide: 'net', //params.positionDirection.toLowerCase()
            ccy: 'USDT', //ccy 	String 	Conditional 	Margin currency, required in the case of closing cross MARGIN position for Futures mode.
        };
        const request = await this.signedRequest('private', 'POST', '/api/v5/trade/close-position', payload);
        if (request.success) {
            return this.formattedResponse({ data: request.data });
        }
        return this.formattedResponse({ errors: request.errors });
    }
    async trailingStopOrder(params) {
        this.assertInstrumentsReady();
        const contractSize = this.convertAssetSizeToContracts(params.symbol, params.quantity);
        const payload = {
            instId: params.symbol,
            tdMode: 'cross',
            reduceOnly: true,
            side: params.side.toLowerCase(),
            ordType: 'move_order_stop',
            sz: contractSize?.toString(),
            callbackRatio: (params.callbackRate / 100).toString()
        };
        if (params.activatePrice) {
            payload.activePx = params.activatePrice.toString();
        }
        const res = await this.signedRequest('private', 'POST', '/api/v5/trade/order-algo', payload);
        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const data = {
                orderId: res.data[0].algoId,
                symbol: params.symbol,
                status: 'NEW',
                clientOrderId: res.data[0].algoClOrdId || '',
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
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/positions', { instId: symbol, instType: 'SWAP' });
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
            // "realized PnL" might be captured in pnl or upl
            const pnl = res.data.reduce((acc, val) => acc + parseFloat(val.pnl || '0'), 0);
            return this.formattedResponse({ data: pnl });
        }
        return this.formattedResponse({ errors: res.errors });
    }
}
