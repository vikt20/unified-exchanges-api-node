import BinanceStreams, { KlineData } from './BinanceStreams.js';
import { convertPositionDataByRequest, convertPositionRiskDataByRequest, convertPositionRiskToPositionData, convertOrderDataRequestResponse, extractInfo, convertKlinesDataByRequest, convertAggTradesDataByRequest, convertAlgoOrderByRequest } from './converters.js';

import {
    FormattedResponse, ListenKey, GetStaticDepthParams, StaticDepth, AccountData, OrderData, OrderRequestResponse, OrderSide, OrderType, TimeInForce, OrderWorkingType, OrderStatus, PositionDirection, PositionSide, GetOpenOrdersBySymbolParams,
    CancelAllOpenOrdersParams,
    CancelOrderByIdParams,
    MarketOrderParams,
    TrailingStopOrderParams,
    LimitOrderParams, PositionData, StopOrderParams, ReduceOrderParams,
    ReducePositionParams,
    ExtractedInfo,
    ExchangeInfo,
    GetAggTradesParams,
    AggTradesData,
    AlgoOrderResponse,
    StopMarketOrderParams
} from './BinanceBase.js';
import type { ExchangeInfoData, PositionRiskData } from '../core/types.js';
import { IExchangeClient } from '../core/IExchangeClient.js';

type OrderInput = {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity?: number;
    price?: number;
    triggerPrice?: number;
    timeInForce?: TimeInForce;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;
    workingType?: OrderWorkingType;
    callbackRate?: number;
    activatePrice?: number;
    algoType?: 'CONDITIONAL';
}


/* export type OrderRequestResponse = {
    orderId: number,
    symbol: string,
    status: OrderStatus,
    clientOrderId: string,
    price: string,
    avgPrice: string,
    origQty: string,
    executedQty: string,
    cumQuote: string,
    timeInForce: TimeInForce,
    type: OrderType,
    reduceOnly: boolean,
    closePosition: boolean,
    side: OrderSide,
    positionSide: PositionSide,
    stopPrice: string,
    workingType: OrderWorkingType,
    priceProtect: boolean,
    origType: OrderType,
    priceMatch: string,
    selfTradePreventionMode: string,
    goodTillDate: number,
    time: number,
    updateTime: number
} */
export type PositionDataByRequest = {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    breakEvenPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    maxNotionalValue: string;
    marginType: string;
    isolatedMargin: string;
    isAutoAddMargin: string;
    positionSide: string;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
    isolated: boolean;
    adlQuantile: number;
};

export type KlineDataByRequest = [
    number, //Open time
    string, //Open
    string, //High
    string, //Low
    string, //Close
    string, //Volume
    number, //Close time
    string, //Quote asset volume
    number, //Number of trades
    string, //Taker buy base asset volume
    string, //Taker buy quote asset volume
    string //Ignore
]
/**
 * {
  "e": "aggTrade",  // Event type
  "E": 123456789,   // Event time
  "s": "BTCUSDT",    // Symbol
  "a": 5933014,		// Aggregate trade ID
  "p": "0.001",     // Price
  "q": "100",       // Quantity
  "f": 100,         // First trade ID
  "l": 105,         // Last trade ID
  "T": 123456785,   // Trade time
  "m": true,        // Is the buyer the market maker?
}
 */
export type AggTradesDataByRequest = {
    "a": number,         // Aggregate tradeId
    "p": string,  // Price
    "q": string,  // Quantity
    "f": number,         // First tradeId
    "l": number,         // Last tradeId
    "T": number, // Timestamp
    "m": boolean,          // Was the buyer the maker?
}

/**
 * {"buySellRatio":"0.9083","sellVol":"409833397.0000","buyVol":"372257351.0000","timestamp":1764875700000}
 */
export type LongShortRatioDataByRequest = {
    "buySellRatio": string, // Buy sell ratio
    "sellVol": string, // Sell volume
    "buyVol": string, // Buy volume
    "timestamp": number, // Timestamp
}


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

export default class BinanceFutures extends BinanceStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, pingServer: boolean = false) {
        super(apiKey, apiSecret, pingServer);
    }


    async closeListenKey() {
        return await this.signedRequest('futures', 'DELETE', '/fapi/v1/listenKey');
    }

    async getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>> {
        let request = await this.publicRequest('futures', 'GET', '/fapi/v1/exchangeInfo')
        // return this.formattedResponse({ data: this.extractInfo(request.data) });
        if (request.success) {
            return this.formattedResponse({ data: request.data as ExchangeInfoData });
        } else {
            return this.formattedResponse({ errors: request.errors });
        }
    }
    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        return await this.publicRequest('futures', 'GET', '/fapi/v1/depth', { symbol: params.symbol, limit: params.limit ? params.limit : 500 });
    }
    async getKlines(params: { symbol: string, interval: string, startTime?: number, endTime?: number, limit?: number }): Promise<FormattedResponse<KlineData[]>> {
        const request = await this.publicRequest('futures', 'GET', '/fapi/v1/klines', { symbol: params.symbol, interval: params.interval, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: convertKlinesDataByRequest(request.data, params.symbol) });
    }
    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const request = await this.publicRequest('futures', 'GET', '/fapi/v1/aggTrades', { symbol: params.symbol, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: convertAggTradesDataByRequest(request.data, params.symbol) });
    }
    async getLongShortRatio(params: { symbol: string, limit?: number, period?: string, startTime?: number, endTime?: number }): Promise<FormattedResponse<LongShortRatioDataByRequest[]>> {
        const request = await this.publicRequest('futures', 'GET', '/futures/data/takerlongshortRatio', { symbol: params.symbol, limit: params.limit, period: params.period, startTime: params.startTime, endTime: params.endTime });
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: request.data });
    }
    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        return await this.signedRequest('futures', 'GET', '/fapi/v2/balance');
    }
    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        const request = await this.signedRequest('futures', 'GET', '/fapi/v2/positionRisk');
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        if (!request.data) return this.formattedResponse({ data: [] });

        return this.formattedResponse({
            data: request.data.map(convertPositionRiskDataByRequest)
        });
    }
    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        const request = await this.getPositionRisk();
        if (request.errors || !request.data) return this.formattedResponse({ errors: request.errors });

        // Filter positions with non-zero amounts and convert to PositionData
        const openPositions: PositionData[] = request.data
            .filter(pos => pos.positionAmount !== 0)
            .map(convertPositionRiskToPositionData);

        return this.formattedResponse({ data: openPositions });
    }
    async getOpenPositionBySymbol(params: { symbol: string }): Promise<FormattedResponse<PositionData>> {
        let request = await this.getOpenPositions();
        if (request.errors || !request.data) return this.formattedResponse({ errors: request.errors });
        let position = request.data.find(p => p.symbol === params.symbol);
        if (typeof position === 'undefined') return this.formattedResponse({ errors: 'Position not found' });
        return this.formattedResponse({ data: position });
    }
    async getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>> {
        const query = symbol ? { symbol } : {};

        const [regularRes, algoRes] = await Promise.all([
            this.signedRequest('futures', 'GET', '/fapi/v1/openOrders', query),
            this.signedRequest('futures', 'GET', '/fapi/v1/openAlgoOrders', query)  // correct endpoint
        ]).catch(err => {
            const msg = err || 'Network error';
            return [
                { success: false, errors: msg },
                { success: false, errors: msg }
            ] as const;
        });

        // If any error, return it
        if (regularRes.errors || algoRes.errors) return this.formattedResponse({ errors: regularRes.errors || algoRes.errors });

        const orders: OrderData[] = [];
        const errorMessages: string[] = [];

        // Regular orders
        if (regularRes.success && regularRes.data) {
            orders.push(...regularRes.data.map(convertOrderDataRequestResponse));
        } else if (regularRes.errors?.length) {
            errorMessages.push(regularRes.errors);
        }

        // Algo orders
        if (algoRes.success && algoRes.data) {
            orders.push(...algoRes.data.map(convertAlgoOrderByRequest));
        } else if (algoRes.errors?.length) {
            errorMessages.push(algoRes.errors);
        }

        // Success if we got any orders, even with partial errors

        return this.formattedResponse({
            data: orders,
            errors: errorMessages.length > 0 ? errorMessages.join('; ') : undefined
        });
    }
    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return await this.getOpenOrders(params.symbol);
    }

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        // 1. Fetch a larger limit to increase chances of finding the 'Opening' trades
        // If the position was opened weeks ago, this might still miss the opening trade
        // unless you implement pagination (fetching more history).
        const request = await this.signedRequest("futures", "GET", "/fapi/v1/userTrades", {
            symbol,
            limit: 100
        });

        if (!request.success || request.data?.length === 0) return this.formattedResponse({ errors: 'No trades found' });

        const trades = request.data;

        // Sort Newest to Oldest
        trades.sort((a: any, b: any) => b.time - a.time);

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
                } else {
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

        if (!foundClosingTrades) return this.formattedResponse({ errors: 'No closing trades found' });

        // Final Calculation: Gross PnL - Total Fees (Close Fees + Open Fees)
        return this.formattedResponse({ data: Number((totalRealizedPnl - totalCommission).toFixed(2)) });
    }
    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<any>> {
        const requestReg = this.signedRequest('futures', 'DELETE', '/fapi/v1/allOpenOrders', { symbol: params.symbol }) as Promise<FormattedResponse<any>>;
        const requestAlgo = this.signedRequest('futures', 'DELETE', '/fapi/v1/algoOpenOrders', { symbol: params.symbol }) as Promise<FormattedResponse<any>>;
        const [regularRes, algoRes] = await Promise.all([requestReg, requestAlgo]);

        if (regularRes.success && algoRes.success) {
            return this.formattedResponse({ data: { regular: regularRes.data, algo: algoRes.data } });
        } else {
            return this.formattedResponse({ errors: JSON.stringify([regularRes.errors, algoRes.errors]) });
        }
    }
    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<any>> {
        if (params.isAlgoOrder) {
            return await this.signedRequest('futures', 'DELETE', '/fapi/v1/algoOrder', { symbol: params.symbol, clientalgoid: params.clientOrderId });
        }
        return await this.signedRequest('futures', 'DELETE', '/fapi/v1/order', { symbol: params.symbol, origClientOrderId: params.clientOrderId });
    }

    async marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
        })
    }
    async marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
        })
    }
    async limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            workingType: 'CONTRACT_PRICE',
            timeInForce: 'GTX'
        })
    }
    async limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            workingType: 'CONTRACT_PRICE',
            timeInForce: 'GTX'
        })
    }
    async stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            stopPrice: params.price,
            triggerPrice: params.price,
            closePosition: true,
            workingType: params.workingType,
        })
    }
    async reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'LIMIT',
            price: params.price,
            quantity: params.quantity,
            reduceOnly: true,
            timeInForce: 'GTC',
            workingType: params.workingType,
        })
    }
    async reduceStopOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
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
        })
    }
    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
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
    async reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        if (params.positionDirection === 'LONG') return await this.marketSell({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else if (params.positionDirection === 'SHORT') return await this.marketBuy({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else return this.formattedResponse({ errors: 'Invalid position direction' });
    }
    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: 'TRAILING_STOP_MARKET',
            quantity: params.quantity,
            callbackRate: params.callbackRate,
            activatePrice: params.activatePrice,
            reduceOnly: true
        })
    }


    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const {
            symbol,
            side,
            type,
            quantity = undefined,
            price = undefined,
            triggerPrice = undefined,
            // timeInForce = orderInput.reduceOnly ? undefined : 'GTC',
            timeInForce = undefined,
            stopPrice = undefined, //used with STOP_MARKET or TAKE_PROFIT_MARKET
            closePosition = false, //used with STOP_MARKET or TAKE_PROFIT_MARKET
            reduceOnly = undefined,
            workingType = 'CONTRACT_PRICE',
            callbackRate = undefined, //used with trailing
            activatePrice = undefined, //used with trailing
            algoType = undefined //used with trailing
        } = orderInput

        const timestamp = Date.now();
        let params: any = {
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
        }
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key])
        if (algoType) return await this.signedRequest('futures', 'POST', '/fapi/v1/algoOrder', params);
        else return await this.signedRequest('futures', 'POST', '/fapi/v1/order', params);
    }


}