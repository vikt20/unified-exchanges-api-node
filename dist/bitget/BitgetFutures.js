import BitgetStreams from './BitgetStreams.js';
import { asArray, convertCandle, convertDepth, convertFundingHistory, convertFuturesAccount, convertFuturesExchangeInfo, convertOrder, convertPosition, convertPositionRisk, convertTrade, createOrderResponse, isBitgetCandle, isBitgetFuturesAccount, isBitgetFuturesContract, isBitgetFundingHistoryItem, isBitgetOrder, isBitgetOrderBook, isBitgetPendingOrders, isBitgetPlaceOrderResponse, isBitgetPosition, isBitgetTrade, isRecord, toBitgetForce, toBitgetOrderType, toBitgetSide, toNumber } from './converters.js';
export default class BitgetFutures extends BitgetStreams {
    async closeListenKey() {
        return this.formattedResponse({ data: 'Not applicable for Bitget V2' });
    }
    async getExchangeInfo() {
        const res = await this.publicRequest('futures', 'GET', '/api/v2/mix/market/contracts', {
            productType: this.productType
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: convertFuturesExchangeInfo(res.data.filter(isBitgetFuturesContract)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getStaticDepth(params) {
        const res = await this.publicRequest('futures', 'GET', '/api/v2/mix/market/merge-depth', {
            productType: this.productType,
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data && isBitgetOrderBook(res.data)) {
            return this.formattedResponse({ data: convertDepth(params.symbol, res.data) });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget depth response' });
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
                productType: this.productType,
                symbol: params.symbol,
                granularity: this.normalizeRestInterval(params.interval),
                startTime: pageStart,
                endTime: pageEnd,
                limit: Math.min(1000, requestedLimit - candlesByTimestamp.size)
            };
            const res = await this.publicRequest('futures', 'GET', '/api/v2/mix/market/candles', query);
            if (!res.success || !res.data) {
                return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget candles response' });
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
        const res = await this.publicRequest('futures', 'GET', '/api/v2/mix/market/fills', {
            productType: this.productType,
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetTrade).map(item => convertTrade(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getFundingHistory(params) {
        const query = {
            productType: this.productType,
            symbol: params.symbol,
            pageSize: params.limit ?? 100
        };
        if (params.startTime !== undefined)
            query.startTime = params.startTime;
        if (params.endTime !== undefined)
            query.endTime = params.endTime;
        const res = await this.publicRequest('futures', 'GET', '/api/v2/mix/market/history-fund-rate', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetFundingHistoryItem).map(convertFundingHistory) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getBalance() {
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/account/accounts', {
            productType: this.productType
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetFuturesAccount).map(convertFuturesAccount) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getSymbolLeverage({ symbol }) {
        const [account, contracts] = await Promise.all([
            this.signedRequest('futures', 'GET', '/api/v2/mix/account/account', { symbol, productType: this.productType, marginCoin: this.marginCoin }),
            this.publicRequest('futures', 'GET', '/api/v2/mix/market/contracts', { symbol, productType: this.productType })
        ]);
        if (account.errors || contracts.errors)
            return this.formattedResponse({ errors: account.errors ?? contracts.errors });
        const mode = account.data?.marginMode === 'isolated' ? 'isolated' : 'cross';
        const leverage = mode === 'cross' ? account.data?.crossedMarginLeverage ?? account.data?.crossMarginLeverage : account.data?.fixedLongLeverage;
        return this.formattedResponse({ data: { symbol, leverage: Number(leverage ?? 0), maxLeverage: Number(contracts.data?.[0]?.maxLever ?? 0) } });
    }
    async updateSymbolLeverage({ symbol, leverage }) {
        const res = await this.signedRequest('futures', 'POST', '/api/v2/mix/account/set-leverage', { symbol, productType: this.productType, marginCoin: this.marginCoin, leverage: String(leverage) });
        if (res.errors)
            return this.formattedResponse({ errors: res.errors });
        const current = await this.getSymbolLeverage({ symbol });
        return current.success ? this.formattedResponse({ data: { ...current.data, leverage } }) : current;
    }
    async getSymbolMarginMode({ symbol }) {
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/account/account', { symbol, productType: this.productType, marginCoin: this.marginCoin });
        if (res.errors)
            return this.formattedResponse({ errors: res.errors });
        return this.formattedResponse({ data: { symbol, marginMode: res.data?.marginMode === 'isolated' ? 'isolated' : 'cross' } });
    }
    async updateSymbolMarginMode({ symbol, marginMode }) {
        const res = await this.signedRequest('futures', 'POST', '/api/v2/mix/account/set-margin-mode', { symbol, productType: this.productType, marginCoin: this.marginCoin, marginMode: marginMode === 'cross' ? 'crossed' : 'isolated' });
        return res.errors ? this.formattedResponse({ errors: res.errors }) : this.formattedResponse({ data: { symbol, marginMode } });
    }
    async getPositionRisk() {
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/position/all-position', {
            productType: this.productType,
            marginCoin: this.marginCoin
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetPosition).map(convertPositionRisk) });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenPositions() {
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/position/all-position', {
            productType: this.productType,
            marginCoin: this.marginCoin
        });
        if (res.success && res.data) {
            const positions = res.data.filter(isBitgetPosition).map(convertPosition).filter(position => position.isInPosition);
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenPositionBySymbol(params) {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            const position = res.data.find(item => item.symbol === params.symbol);
            return position ? this.formattedResponse({ data: position }) : this.formattedResponse({ errors: 'Position not found' });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrders(symbol) {
        const query = {
            productType: this.productType,
            limit: 100
        };
        if (symbol)
            query.symbol = symbol;
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/order/orders-pending', query);
        if (res.success) {
            const orders = this.extractOrders(res.data).map(convertOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    async getOpenOrdersBySymbol(params) {
        return this.getOpenOrders(params.symbol);
    }
    async cancelAllOpenOrders(params) {
        return this.signedRequest('futures', 'POST', '/api/v2/mix/order/cancel-all-orders', {
            productType: this.productType,
            symbol: params.symbol,
            marginCoin: this.marginCoin
        });
    }
    async cancelOrderById(params) {
        return this.signedRequest('futures', 'POST', '/api/v2/mix/order/cancel-order', {
            productType: this.productType,
            symbol: params.symbol,
            marginCoin: this.marginCoin,
            clientOid: params.clientOrderId
        });
    }
    async customOrder(orderInput) {
        const clientOid = this.createClientOid('bgf');
        const reduceOnly = orderInput.reduceOnly ?? false;
        const payload = {
            productType: this.productType,
            symbol: orderInput.symbol,
            marginCoin: this.marginCoin,
            marginMode: 'crossed',
            side: toBitgetSide(orderInput.side),
            orderType: toBitgetOrderType(orderInput.type),
            size: orderInput.quantity?.toString(),
            price: orderInput.price?.toString(),
            force: toBitgetForce(orderInput.timeInForce),
            clientOid,
            reduceOnly: reduceOnly ? 'YES' : 'NO'
        };
        const endpoint = orderInput.triggerPrice !== undefined
            ? '/api/v2/mix/order/place-tpsl-order'
            : '/api/v2/mix/order/place-order';
        if (orderInput.triggerPrice !== undefined) {
            payload.triggerPrice = orderInput.triggerPrice.toString();
            payload.triggerType = orderInput.workingType === 'MARK_PRICE' ? 'mark_price' : 'fill_price';
            // if sl or tp
            if (reduceOnly && orderInput.closePosition) {
                if (orderInput.type === 'STOP_MARKET') {
                    payload.planType = 'pos_loss';
                }
                else if (orderInput.type === 'TAKE_PROFIT_MARKET') {
                    payload.planType = 'pos_profit';
                }
                if (orderInput.type === 'STOP_MARKET' && orderInput.side === 'BUY') {
                    payload.holdSide = 'sell';
                }
                else if (orderInput.type === 'STOP_MARKET' && orderInput.side === 'SELL') {
                    payload.holdSide = 'buy';
                }
                if (orderInput.type === 'TAKE_PROFIT_MARKET' && orderInput.side === 'BUY') {
                    payload.holdSide = 'sell';
                }
                else if (orderInput.type === 'TAKE_PROFIT_MARKET' && orderInput.side === 'SELL') {
                    payload.holdSide = 'buy';
                }
                payload.executePrice = '0';
            }
            else {
                payload.planType = 'normal_plan';
                payload.executePrice = orderInput.price?.toString() ?? '0';
            }
        }
        console.log('Bitget Order Payload:', payload);
        const res = await this.signedRequest('futures', 'POST', endpoint, payload);
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
                    reduceOnly,
                    closePosition: orderInput.closePosition,
                    timeInForce: orderInput.timeInForce,
                    stopPrice: orderInput.triggerPrice,
                    workingType: orderInput.workingType
                })
            });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget place order response' });
    }
    async marketBuy(params) {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'MARKET', quantity: params.quantity, reduceOnly: params.reduceOnly });
    }
    async marketSell(params) {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'MARKET', quantity: params.quantity, reduceOnly: params.reduceOnly });
    }
    async limitBuy(params) {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }
    async limitSell(params) {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
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
            workingType: params.workingType,
            closePosition: true,
            reduceOnly: true,
            triggerDirection: params.triggerDirection // 1 for stop loss, 2 for take profit
        });
    }
    async stopMarketOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'MARKET',
            quantity: params.quantity,
            triggerPrice: params.price
        });
    }
    async reduceLimitOrder(params) {
        return this.customOrder({ symbol: params.symbol, side: params.side, type: 'LIMIT', quantity: params.quantity, price: params.price, reduceOnly: true, workingType: params.workingType });
    }
    async reducePosition(params) {
        const side = params.positionDirection === 'LONG' ? 'SELL' : 'BUY';
        return this.customOrder({ symbol: params.symbol, side, type: 'MARKET', quantity: params.quantity, reduceOnly: true });
    }
    async trailingStopOrder(params) {
        if (params.activatePrice === undefined) {
            return this.formattedResponse({ errors: 'Bitget trailing stop requires activatePrice to map the unified trailing stop request safely' });
        }
        const clientOid = this.createClientOid('bgt');
        const res = await this.signedRequest('futures', 'POST', '/api/v2/mix/order/place-plan-order', {
            productType: this.productType,
            symbol: params.symbol,
            marginCoin: this.marginCoin,
            marginMode: 'crossed',
            planType: 'track_plan',
            triggerPrice: params.activatePrice.toString(),
            triggerType: 'fill_price',
            side: toBitgetSide(params.side),
            orderType: 'market',
            size: params.quantity.toString(),
            callbackRatio: params.callbackRate.toString(),
            clientOid,
            reduceOnly: 'YES'
        });
        if (res.success && res.data && isBitgetPlaceOrderResponse(res.data)) {
            return this.formattedResponse({
                data: createOrderResponse({
                    symbol: params.symbol,
                    side: params.side,
                    type: 'TRAILING_STOP_MARKET',
                    quantity: params.quantity,
                    clientOid,
                    response: res.data,
                    reduceOnly: true,
                    stopPrice: params.activatePrice
                })
            });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget trailing stop response' });
    }
    async getLatestPnlBySymbol(symbol, startTime, endTime) {
        const query = {
            productType: this.productType,
            symbol,
            limit: 100
        };
        if (startTime !== undefined)
            query.startTime = startTime;
        if (endTime !== undefined)
            query.endTime = endTime;
        const res = await this.signedRequest('futures', 'GET', '/api/v2/mix/order/close-positions', query);
        if (res.success && res.data) {
            const total = res.data
                .filter(isRecord)
                .reduce((sum, item) => sum + (typeof item.pnl === 'string' ? toNumber(item.pnl) : 0), 0);
            return this.formattedResponse({ data: total });
        }
        return this.formattedResponse({ errors: res.errors });
    }
    extractOrders(data) {
        if (Array.isArray(data))
            return data.filter(isBitgetOrder);
        if (isBitgetPendingOrders(data))
            return asArray(data.entrustedList, isBitgetOrder);
        return [];
    }
    createClientOid(prefix) {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }
    normalizeRestInterval(interval) {
        const map = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1H',
            '4h': '4H',
            '1d': '1D',
            '1w': '1W'
        };
        return map[interval] ?? interval;
    }
}
