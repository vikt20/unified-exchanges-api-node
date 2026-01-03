import { FormattedResponse, GetStaticDepthParams, StaticDepth, ExtractedInfo, ExchangeInfo, AccountData, OrderData, OrderRequestResponse, OrderSide, OrderType, TimeInForce, OrderWorkingType, OrderStatus, PositionDirection, PositionSide, CancelAllOpenOrdersParams, CancelOrderByIdParams, MarketOrderParams, TrailingStopOrderParams, LimitOrderParams, PositionData, StopOrderParams, ReduceOrderParams, ReducePositionParams, StopMarketOrderParams, GetAggTradesParams, AggTradesData } from "./BinanceBase.js";
import { KlineDataByRequest, AggTradesDataByRequest } from "./BinanceFutures.js";
import BinanceStreams, { KlineData } from "./BinanceStreams.js";
import { convertKlinesDataByRequest, convertOrderDataRequestResponse, extractInfo, convertAggTradesDataByRequest } from "./converters.js";
import { IExchangeClient } from '../core/IExchangeClient.js';
import type { ExchangeInfoData, PositionRiskData } from '../core/types.js';

export default class BinanceSpot extends BinanceStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string) {
        super(apiKey, apiSecret)
    }

    async closeListenKey() {
        return await this.signedRequest('spot', 'DELETE', '/api/v3/userDataStream');
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        return await this.publicRequest('spot', 'GET', '/api/v3/depth', { symbol: params.symbol, limit: params.limit ? params.limit : 500 });
    }

    async getKlines(params: { symbol: string, interval: string, startTime?: number, endTime?: number, limit?: number }): Promise<FormattedResponse<KlineData[]>> {
        const request = await this.publicRequest('spot', 'GET', '/api/v3/klines', { symbol: params.symbol, interval: params.interval, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: convertKlinesDataByRequest(request.data, params.symbol) });
    }

    async getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>> {
        let request = await this.publicRequest('spot', 'GET', '/api/v1/exchangeInfo')
        if (request.success) {
            return this.formattedResponse({ data: request.data as ExchangeInfoData });
        } else {
            return this.formattedResponse({ errors: request.errors });
        }
    }

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        return await this.signedRequest('spot', 'GET', '/api/v3/account');
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        // Not applicable for spot trading - return empty array
        return this.formattedResponse({ data: [] });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getOpenPositionBySymbol(params: { symbol: string }): Promise<FormattedResponse<PositionData>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getOpenOrders(): Promise<FormattedResponse<OrderData[]>> {
        const request = await this.signedRequest('spot', 'GET', '/api/v3/openOrders') as FormattedResponse<OrderRequestResponse[]>;
        if (request.success && request.data !== undefined) {
            return this.formattedResponse({ data: request.data.map(convertOrderDataRequestResponse) });
        } else {
            return this.formattedResponse({ errors: request.errors });
        }
    }

    async getOpenOrdersBySymbol(params: { symbol: string }): Promise<FormattedResponse<OrderData[]>> {
        const request = await this.signedRequest('spot', 'GET', '/api/v3/openOrders', { symbol: params.symbol }) as FormattedResponse<OrderRequestResponse[]>;
        if (request.success && request.data !== undefined) {
            return this.formattedResponse({ data: request.data.map(convertOrderDataRequestResponse) });
        } else {
            return this.formattedResponse({ errors: request.errors });
        }
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<any>> {
        return await this.signedRequest('spot', 'DELETE', '/api/v3/openOrders', { symbol: params.symbol });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<any>> {
        return await this.signedRequest('spot', 'DELETE', '/api/v3/order', { symbol: params.symbol, origClientOrderId: params.clientOrderId });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'MARKET',
            quantity: params.quantity
        });
    }

    async marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: params.quantity
        });
    }

    async limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            timeInForce: 'GTC'
        });
    }

    async limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            timeInForce: 'GTC'
        });
    }

    async stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        // Not applicable for spot trading
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async customOrder(orderInput: { symbol: string, side: OrderSide, type: OrderType, quantity?: number, price?: number, timeInForce?: TimeInForce }): Promise<FormattedResponse<OrderRequestResponse>> {
        const {
            symbol,
            side,
            type,
            quantity = undefined,
            price = undefined,
            timeInForce = undefined
        } = orderInput;

        const timestamp = Date.now();
        let params: any = {
            symbol,
            side,
            type,
            timeInForce,
            quantity,
            price,
            timestamp,
            recvWindow: this.recvWindow,
            newOrderResponseType: 'RESULT'
        };
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
        return await this.signedRequest('spot', 'POST', '/api/v3/order', params);
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const request = await this.publicRequest('spot', 'GET', '/api/v3/aggTrades', { symbol: params.symbol, startTime: params.startTime, endTime: params.endTime, limit: params.limit });
        if (request.errors) return this.formattedResponse({ errors: request.errors });
        return this.formattedResponse({ data: convertAggTradesDataByRequest(request.data, params.symbol) });
    }

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        // Not applicable for spot trading - PnL tracking is futures-specific
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
}