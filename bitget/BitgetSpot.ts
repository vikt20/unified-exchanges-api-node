import BitgetStreams from './BitgetStreams.js';
import type { IExchangeClient } from '../core/IExchangeClient.js';
import type {
    AccountData,
    AggTradesData,
    CancelAllOpenOrdersParams,
    CancelOrderByIdParams,
    ExtractedInfo,
    FormattedResponse,
    FundingHistoryData,
    GetAggTradesParams,
    GetFundingHistoryParams,
    GetOpenOrdersBySymbolParams,
    GetStaticDepthParams,
    KlineData,
    LimitOrderParams,
    MarketOrderParams,
    OrderData,
    OrderInput,
    OrderRequestResponse,
    PositionData,
    PositionRiskData,
    ReduceOrderParams,
    ReducePositionParams,
    StaticDepth,
    StopMarketOrderParams,
    StopOrderParams,
    TrailingStopOrderParams
} from '../core/types.js';
import {
    BitgetCandle,
    BitgetOrder,
    BitgetOrderBook,
    BitgetPlaceOrderResponse,
    BitgetSpotAsset,
    BitgetSpotSymbol,
    convertCandle,
    convertDepth,
    convertOrder,
    convertSpotAsset,
    convertSpotExchangeInfo,
    convertTrade,
    createOrderResponse,
    isBitgetCandle,
    isBitgetOrder,
    isBitgetOrderBook,
    isBitgetPlaceOrderResponse,
    isBitgetSpotAsset,
    isBitgetSpotSymbol,
    isBitgetTrade,
    toBitgetForce,
    toBitgetOrderType,
    toBitgetSide
} from './converters.js';
import type { BitgetParams } from './BitgetBase.js';

export default class BitgetSpot extends BitgetStreams implements IExchangeClient {
    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: 'Not applicable for Bitget V2' });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest<BitgetSpotSymbol[]>('spot', 'GET', '/api/v2/spot/public/symbols');
        if (res.success && res.data) {
            return this.formattedResponse({ data: convertSpotExchangeInfo(res.data.filter(isBitgetSpotSymbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest<BitgetOrderBook>('spot', 'GET', '/api/v2/spot/market/merge-depth', {
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data && isBitgetOrderBook(res.data)) {
            return this.formattedResponse({ data: convertDepth(params.symbol, res.data) });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget spot depth response' });
    }

    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number }): Promise<FormattedResponse<KlineData[]>> {
        const query: BitgetParams = {
            symbol: params.symbol,
            granularity: this.normalizeRestInterval(params.interval),
            limit: params.limit ?? 100
        };
        if (params.startTime !== undefined) query.startTime = params.startTime;
        if (params.endTime !== undefined) query.endTime = params.endTime;

        const res = await this.publicRequest<BitgetCandle[]>('spot', 'GET', '/api/v2/spot/market/candles', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetCandle).map(item => convertCandle(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest<unknown[]>('spot', 'GET', '/api/v2/spot/market/fills', {
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetTrade).map(item => convertTrade(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getFundingHistory(_params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest<BitgetSpotAsset[]>('spot', 'GET', '/api/v2/spot/account/assets');
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetSpotAsset).map(convertSpotAsset) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        return this.formattedResponse({ data: [] });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async getOpenPositionBySymbol(_params: { symbol: string }): Promise<FormattedResponse<PositionData>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>> {
        const query: BitgetParams = { limit: 100 };
        if (symbol) query.symbol = symbol;
        const res = await this.signedRequest<unknown[]>('spot', 'GET', '/api/v2/spot/trade/unfilled-orders', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetOrder).map(convertOrder) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>> {
        return this.signedRequest('spot', 'POST', '/api/v2/spot/trade/cancel-symbol-order', {
            symbol: params.symbol
        });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        return this.signedRequest('spot', 'POST', '/api/v2/spot/trade/cancel-order', {
            symbol: params.symbol,
            clientOid: params.clientOrderId
        });
    }

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const clientOid = this.createClientOid('bgs');
        const payload: BitgetParams = {
            symbol: orderInput.symbol,
            side: toBitgetSide(orderInput.side),
            orderType: toBitgetOrderType(orderInput.type),
            force: toBitgetForce(orderInput.timeInForce),
            size: orderInput.quantity?.toString(),
            price: orderInput.price?.toString(),
            clientOid
        };

        const res = await this.signedRequest<BitgetPlaceOrderResponse>('spot', 'POST', '/api/v2/spot/trade/place-order', payload);
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

    async marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'MARKET', quantity: params.quantity });
    }

    async marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'MARKET', quantity: params.quantity });
    }

    async limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }

    async limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }

    async stopOrder(_params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Bitget spot stop orders are not exposed through the unified spot interface yet' });
    }

    async stopMarketOrder(_params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Bitget spot stop-market orders are not exposed through the unified spot interface yet' });
    }

    async reduceLimitOrder(_params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async reducePosition(_params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async trailingStopOrder(_params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    async getLatestPnlBySymbol(_symbol: string): Promise<FormattedResponse<number>> {
        return this.formattedResponse({ errors: 'Not applicable for Bitget spot trading' });
    }

    private createClientOid(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }

    private normalizeRestInterval(interval: string): string {
        const map: Record<string, string> = {
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

