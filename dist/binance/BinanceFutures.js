"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BinanceStreams_js_1 = __importDefault(require("./BinanceStreams.js"));
const converters_js_1 = require("./converters.js");
/* export interface IBinanceClass {
    closeListenKey(): Promise<any>;
    getExchangeInfo(): Promise<FormattedResponse<ExchangeInfo>>;
    getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>>;
    getKlines(params: { symbol: string, interval: string, startTime?: number, endTime?: number, limit?: number }): Promise<FormattedResponse<KlineData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<any>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: { symbol: string }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<any>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<any>>;
    trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>>;
    getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>>;
} */
class BinanceFutures extends BinanceStreams_js_1.default {
    constructor(apiKey, apiSecret, isTest = false, pingServer = false) {
        super(apiKey, apiSecret, isTest, pingServer);
    }
    async closeListenKey() {
        return await this.signedRequest('futures', 'DELETE', '/fapi/v1/listenKey');
    }
    async getExchangeInfo() {
        let request = await this.publicRequest('futures', 'GET', '/fapi/v1/exchangeInfo');
        if (request.success && request.data) {
            return this.formattedResponse({ data: (0, converters_js_1.extractInfo)(request.data.symbols) });
        }
        else {
            return this.formattedResponse({ errors: request.errors });
        }
    }
    async getStaticDepth(params) {
        return await this.publicRequest('futures', 'GET', '/fapi/v1/depth', { symbol: params.symbol, limit: params.limit ? params.limit : 500 });
    }
    async getKlines(params) {
        const request = await this.publicRequest('futures', 'GET', '/fapi/v1/klines', { symbol: params.symbol, interval: params.interval, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors)
            return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: (0, converters_js_1.convertKlinesDataByRequest)(request.data, params.symbol) });
    }
    async getAggTrades(params) {
        const request = await this.publicRequest('futures', 'GET', '/fapi/v1/aggTrades', { symbol: params.symbol, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors)
            return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: (0, converters_js_1.convertAggTradesDataByRequest)(request.data, params.symbol) });
    }
    async getLongShortRatio(params) {
        const request = await this.publicRequest('futures', 'GET', '/futures/data/takerlongshortRatio', { symbol: params.symbol, limit: params.limit, period: params.period, startTime: params.startTime, endTime: params.endTime });
        if (request.errors)
            return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: request.data });
    }
    async getBalance() {
        return await this.signedRequest('futures', 'GET', '/fapi/v2/balance');
    }
    async getPositionRisk() {
        const request = await this.signedRequest('futures', 'GET', '/fapi/v2/positionRisk');
        if (request.errors)
            return this.formattedResponse({ errors: request.errors });
        if (!request.data)
            return this.formattedResponse({ data: [] });
        return this.formattedResponse({
            data: request.data.map(converters_js_1.convertPositionRiskDataByRequest)
        });
    }
    async getOpenPositions() {
        const request = await this.getPositionRisk();
        if (request.errors || !request.data)
            return this.formattedResponse({ errors: request.errors });
        // Filter positions with non-zero amounts and convert to PositionData
        const openPositions = request.data
            .filter(pos => pos.positionAmount !== 0)
            .map(converters_js_1.convertPositionRiskToPositionData);
        return this.formattedResponse({ data: openPositions });
    }
    async getOpenPositionBySymbol(params) {
        let request = await this.getOpenPositions();
        if (request.errors || !request.data)
            return this.formattedResponse({ errors: request.errors });
        let position = request.data.find(p => p.symbol === params.symbol);
        if (typeof position === 'undefined')
            return this.formattedResponse({ errors: 'Position not found' });
        return this.formattedResponse({ data: position });
    }
    async getOpenOrders(symbol) {
        const query = symbol ? { symbol } : {};
        const [regularRes, algoRes] = await Promise.all([
            this.signedRequest('futures', 'GET', '/fapi/v1/openOrders', query),
            this.signedRequest('futures', 'GET', '/fapi/v1/openAlgoOrders', query) // correct endpoint
        ]).catch(err => {
            const msg = err || 'Network error';
            return [
                { success: false, errors: msg },
                { success: false, errors: msg }
            ];
        });
        // If any error, return it
        if (regularRes.errors || algoRes.errors)
            return this.formattedResponse({ errors: regularRes.errors || algoRes.errors });
        const orders = [];
        const errorMessages = [];
        // Regular orders
        if (regularRes.success && regularRes.data) {
            orders.push(...regularRes.data.map(converters_js_1.convertOrderDataRequestResponse));
        }
        else if (regularRes.errors?.length) {
            errorMessages.push(regularRes.errors);
        }
        // Algo orders
        if (algoRes.success && algoRes.data) {
            orders.push(...algoRes.data.map(converters_js_1.convertAlgoOrderByRequest));
        }
        else if (algoRes.errors?.length) {
            errorMessages.push(algoRes.errors);
        }
        // Success if we got any orders, even with partial errors
        return this.formattedResponse({
            data: orders,
            errors: errorMessages.length > 0 ? errorMessages.join('; ') : undefined
        });
    }
    async getOpenOrdersBySymbol(params) {
        return await this.getOpenOrders(params.symbol);
    }
    async getLatestPnlBySymbol(symbol) {
        // 1. Fetch a larger limit to increase chances of finding the 'Opening' trades
        // If the position was opened weeks ago, this might still miss the opening trade
        // unless you implement pagination (fetching more history).
        const request = await this.signedRequest("futures", "GET", "/fapi/v1/userTrades", {
            symbol,
            limit: 100
        });
        if (!request.success || request.data?.length === 0)
            return this.formattedResponse({ errors: 'No trades found' });
        const trades = request.data;
        // Sort Newest to Oldest
        trades.sort((a, b) => b.time - a.time);
        let totalRealizedPnl = 0;
        let totalCommission = 0;
        // Quantity logic variables
        let qtyClosedToMatch = 0;
        let foundClosingTrades = false;
        for (const trade of trades) {
            const pnl = Number(trade.realizedPnl);
            const commission = Number(trade.commission);
            const qty = Number(trade.qty); // Always positive in Binance API
            // --- Phase 1: Identify Closing Trades ---
            if (pnl !== 0) {
                foundClosingTrades = true;
                // Add PnL (can be positive or negative)
                totalRealizedPnl += pnl;
                // Subtract Commission (always positive cost)
                totalCommission += commission;
                // Track how much volume we need to find opening fees for
                qtyClosedToMatch += qty;
            }
            // --- Phase 2: Identify Opening Trades ---
            // We only look at opening trades if we have already found the closing chunk
            else if (foundClosingTrades && qtyClosedToMatch > 0) {
                // This is an opening trade (pnl is 0)
                if (qty >= qtyClosedToMatch) {
                    // CASE A: This opening trade is bigger or equal to what we closed.
                    // Example: We closed 5 BTC, this entry was a buy of 10 BTC.
                    // We only paid fees on the 5 BTC part for this specific cycle.
                    const ratio = qtyClosedToMatch / qty;
                    const proRatedCommission = commission * ratio;
                    totalCommission += proRatedCommission;
                    // We have matched all quantity. Stop.
                    qtyClosedToMatch = 0;
                    break;
                }
                else {
                    // CASE B: This opening trade is smaller than what we closed.
                    // Example: We closed 5 BTC, this entry was a buy of 2 BTC.
                    // We take the full commission of this 2 BTC and keep looking for the other 3.
                    totalCommission += commission;
                    qtyClosedToMatch -= qty;
                }
            }
            // --- Phase 3: Safety Break ---
            // If we found closing trades but haven't found the opening trade 
            // (maybe it was opened too long ago and isn't in the list of 100),
            // we essentially stop to prevent adding commissions from totally unrelated previous cycles.
            else if (foundClosingTrades && qtyClosedToMatch <= 0) {
                break;
            }
        }
        if (!foundClosingTrades)
            return this.formattedResponse({ errors: 'No closing trades found' });
        // Final Calculation: Gross PnL - Total Fees (Close Fees + Open Fees)
        return this.formattedResponse({ data: Number((totalRealizedPnl - totalCommission).toFixed(2)) });
    }
    async cancelAllOpenOrders(params) {
        const requestReg = this.signedRequest('futures', 'DELETE', '/fapi/v1/allOpenOrders', { symbol: params.symbol });
        const requestAlgo = this.signedRequest('futures', 'DELETE', '/fapi/v1/algoOpenOrders', { symbol: params.symbol });
        const [regularRes, algoRes] = await Promise.all([requestReg, requestAlgo]);
        if (regularRes.success && algoRes.success) {
            return this.formattedResponse({ data: { regular: regularRes.data, algo: algoRes.data } });
        }
        else {
            return this.formattedResponse({ errors: JSON.stringify([regularRes.errors, algoRes.errors]) });
        }
    }
    async cancelOrderById(params) {
        if (params.isAlgoOrder) {
            return await this.signedRequest('futures', 'DELETE', '/fapi/v1/algoOrder', { symbol: params.symbol, clientalgoid: params.clientOrderId });
        }
        return await this.signedRequest('futures', 'DELETE', '/fapi/v1/order', { symbol: params.symbol, origClientOrderId: params.clientOrderId });
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
            workingType: 'CONTRACT_PRICE',
            timeInForce: 'GTX'
        });
    }
    async limitSell(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            workingType: 'CONTRACT_PRICE',
            timeInForce: 'GTX'
        });
    }
    async stopOrder(params) {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            stopPrice: params.price,
            triggerPrice: params.price,
            closePosition: true,
            workingType: params.workingType,
        });
    }
    async reduceLimitOrder(params) {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'LIMIT',
            price: params.price,
            quantity: params.quantity,
            reduceOnly: true,
            timeInForce: 'GTC',
            workingType: params.workingType,
        });
    }
    async reduceStopOrder(params) {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: 'STOP_MARKET',
            triggerPrice: params.price,
            stopPrice: params.price,
            quantity: params.quantity,
            reduceOnly: true,
            timeInForce: 'GTC',
            workingType: params.workingType,
        });
    }
    async stopMarketOrder(params) {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: 'STOP_MARKET',
            quantity: params.quantity,
            triggerPrice: params.price,
            stopPrice: params.price,
            timeInForce: 'GTC'
        });
    }
    async reducePosition(params) {
        if (params.positionDirection === 'LONG')
            return await this.marketSell({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else if (params.positionDirection === 'SHORT')
            return await this.marketBuy({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else
            return this.formattedResponse({ errors: 'Invalid position direction' });
    }
    async trailingStopOrder(params) {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: 'TRAILING_STOP_MARKET',
            quantity: params.quantity,
            callbackRate: params.callbackRate,
            activatePrice: params.activatePrice,
            reduceOnly: true
        });
    }
    async customOrder(orderInput) {
        const { symbol, side, type, quantity = undefined, price = undefined, triggerPrice = undefined, 
        // timeInForce = orderInput.reduceOnly ? undefined : 'GTC',
        timeInForce = undefined, stopPrice = undefined, //used with STOP_MARKET or TAKE_PROFIT_MARKET
        closePosition = false, //used with STOP_MARKET or TAKE_PROFIT_MARKET
        reduceOnly = undefined, workingType = 'CONTRACT_PRICE', callbackRate = undefined, //used with trailing
        activatePrice = undefined, //used with trailing
        algoType = undefined //used with trailing
         } = orderInput;
        const timestamp = Date.now();
        let params = {
            symbol,
            side,
            type,
            timeInForce,
            quantity,
            price,
            triggerPrice,
            stopPrice,
            closePosition,
            reduceOnly,
            workingType,
            timestamp,
            recWindow: this.recvWindow,
            newOrderResponseType: 'RESULT',
            callbackRate,
            activatePrice,
            algoType
        };
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
        if (algoType)
            return await this.signedRequest('futures', 'POST', '/fapi/v1/algoOrder', params);
        else
            return await this.signedRequest('futures', 'POST', '/fapi/v1/order', params);
    }
}
exports.default = BinanceFutures;
