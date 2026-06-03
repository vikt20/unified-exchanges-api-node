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
    PositionDirection,
    PositionRiskData,
    ReduceOrderParams,
    ReducePositionParams,
    StaticDepth,
    StopMarketOrderParams,
    StopOrderParams,
    TrailingStopOrderParams
} from '../core/types.js';
import {
    asArray,
    BitgetCandle,
    BitgetFuturesAccount,
    BitgetFuturesContract,
    BitgetFundingHistoryItem,
    BitgetOrder,
    BitgetOrderBook,
    BitgetPendingOrders,
    BitgetPlaceOrderResponse,
    convertCandle,
    convertDepth,
    convertFundingHistory,
    convertFuturesAccount,
    convertFuturesExchangeInfo,
    convertOrder,
    convertPosition,
    convertPositionRisk,
    convertTrade,
    createOrderResponse,
    isBitgetCandle,
    isBitgetFuturesAccount,
    isBitgetFuturesContract,
    isBitgetFundingHistoryItem,
    isBitgetOrder,
    isBitgetOrderBook,
    isBitgetPendingOrders,
    isBitgetPlaceOrderResponse,
    isBitgetPosition,
    isBitgetTrade,
    isRecord,
    toBitgetForce,
    toBitgetOrderType,
    toBitgetSide,
    toNumber
} from './converters.js';
import type { BitgetParams } from './BitgetBase.js';

export default class BitgetFutures extends BitgetStreams implements IExchangeClient {
    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: 'Not applicable for Bitget V2' });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest<BitgetFuturesContract[]>('futures', 'GET', '/api/v2/mix/market/contracts', {
            productType: this.productType
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: convertFuturesExchangeInfo(res.data.filter(isBitgetFuturesContract)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest<BitgetOrderBook>('futures', 'GET', '/api/v2/mix/market/merge-depth', {
            productType: this.productType,
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data && isBitgetOrderBook(res.data)) {
            return this.formattedResponse({ data: convertDepth(params.symbol, res.data) });
        }
        return this.formattedResponse({ errors: res.errors ?? 'Invalid Bitget depth response' });
    }

    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number }): Promise<FormattedResponse<KlineData[]>> {
        const query: BitgetParams = {
            productType: this.productType,
            symbol: params.symbol,
            granularity: this.normalizeRestInterval(params.interval),
            limit: params.limit ?? 100
        };
        if (params.startTime !== undefined) query.startTime = params.startTime;
        if (params.endTime !== undefined) query.endTime = params.endTime;

        const res = await this.publicRequest<BitgetCandle[]>('futures', 'GET', '/api/v2/mix/market/candles', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetCandle).map(item => convertCandle(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest<unknown[]>('futures', 'GET', '/api/v2/mix/market/fills', {
            productType: this.productType,
            symbol: params.symbol,
            limit: params.limit ?? 100
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetTrade).map(item => convertTrade(item, params.symbol)) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getFundingHistory(params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>> {
        const query: BitgetParams = {
            productType: this.productType,
            symbol: params.symbol,
            pageSize: params.limit ?? 100
        };
        if (params.startTime !== undefined) query.startTime = params.startTime;
        if (params.endTime !== undefined) query.endTime = params.endTime;

        const res = await this.publicRequest<BitgetFundingHistoryItem[]>('futures', 'GET', '/api/v2/mix/market/history-fund-rate', query);
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetFundingHistoryItem).map(convertFundingHistory) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest<BitgetFuturesAccount[]>('futures', 'GET', '/api/v2/mix/account/accounts', {
            productType: this.productType
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetFuturesAccount).map(convertFuturesAccount) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        const res = await this.signedRequest<unknown[]>('futures', 'GET', '/api/v2/mix/position/all-position', {
            productType: this.productType,
            marginCoin: this.marginCoin
        });
        if (res.success && res.data) {
            return this.formattedResponse({ data: res.data.filter(isBitgetPosition).map(convertPositionRisk) });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        const res = await this.signedRequest<unknown[]>('futures', 'GET', '/api/v2/mix/position/all-position', {
            productType: this.productType,
            marginCoin: this.marginCoin
        });
        if (res.success && res.data) {
            const positions = res.data.filter(isBitgetPosition).map(convertPosition).filter(position => position.isInPosition);
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenPositionBySymbol(params: { symbol: string }): Promise<FormattedResponse<PositionData>> {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            const position = res.data.find(item => item.symbol === params.symbol);
            return position ? this.formattedResponse({ data: position }) : this.formattedResponse({ errors: 'Position not found' });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>> {
        const query: BitgetParams = {
            productType: this.productType,
            limit: 100
        };
        if (symbol) query.symbol = symbol;

        const res = await this.signedRequest<unknown>('futures', 'GET', '/api/v2/mix/order/orders-pending', query);
        if (res.success) {
            const orders = this.extractOrders(res.data).map(convertOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>> {
        return this.signedRequest('futures', 'POST', '/api/v2/mix/order/cancel-all-orders', {
            productType: this.productType,
            symbol: params.symbol,
            marginCoin: this.marginCoin
        });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        return this.signedRequest('futures', 'POST', '/api/v2/mix/order/cancel-order', {
            productType: this.productType,
            symbol: params.symbol,
            marginCoin: this.marginCoin,
            clientOid: params.clientOrderId
        });
    }

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const clientOid = this.createClientOid('bgf');
        const reduceOnly = orderInput.reduceOnly ?? false;
        const payload: BitgetParams = {
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
            ? '/api/v2/mix/order/place-plan-order'
            : '/api/v2/mix/order/place-order';

        if (orderInput.triggerPrice !== undefined) {
            payload.triggerPrice = orderInput.triggerPrice.toString();
            payload.triggerType = orderInput.workingType === 'MARK_PRICE' ? 'mark_price' : 'fill_price';
            payload.planType = 'normal_plan';
            payload.executePrice = orderInput.price?.toString() ?? '0';
        }

        const res = await this.signedRequest<BitgetPlaceOrderResponse>('futures', 'POST', endpoint, payload);
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

    async marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'MARKET', quantity: params.quantity, reduceOnly: params.reduceOnly });
    }

    async marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'MARKET', quantity: params.quantity, reduceOnly: params.reduceOnly });
    }

    async limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'BUY', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }

    async limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: 'SELL', type: 'LIMIT', quantity: params.quantity, price: params.price, timeInForce: 'GTC' });
    }

    async stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: params.quantity,
            price: params.price,
            triggerPrice: params.price,
            workingType: params.workingType,
            closePosition: true
        });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: params.side, type: 'MARKET', quantity: params.quantity, triggerPrice: params.price });
    }

    async reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({ symbol: params.symbol, side: params.side, type: 'LIMIT', quantity: params.quantity, price: params.price, reduceOnly: true, workingType: params.workingType });
    }

    async reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        const side = params.positionDirection === 'LONG' ? 'SELL' : 'BUY';
        return this.customOrder({ symbol: params.symbol, side, type: 'MARKET', quantity: params.quantity, reduceOnly: true });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        if (params.activatePrice === undefined) {
            return this.formattedResponse({ errors: 'Bitget trailing stop requires activatePrice to map the unified trailing stop request safely' });
        }
        const clientOid = this.createClientOid('bgt');
        const res = await this.signedRequest<BitgetPlaceOrderResponse>('futures', 'POST', '/api/v2/mix/order/place-plan-order', {
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

    async getLatestPnlBySymbol(symbol: string, startTime?: number, endTime?: number): Promise<FormattedResponse<number>> {
        const query: BitgetParams = {
            productType: this.productType,
            symbol,
            limit: 100
        };
        if (startTime !== undefined) query.startTime = startTime;
        if (endTime !== undefined) query.endTime = endTime;

        const res = await this.signedRequest<unknown[]>('futures', 'GET', '/api/v2/mix/order/close-positions', query);
        if (res.success && res.data) {
            const total = res.data
                .filter(isRecord)
                .reduce((sum, item) => sum + (typeof item.pnl === 'string' ? toNumber(item.pnl) : 0), 0);
            return this.formattedResponse({ data: total });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    private extractOrders(data: unknown): BitgetOrder[] {
        if (Array.isArray(data)) return data.filter(isBitgetOrder);
        if (isBitgetPendingOrders(data)) return asArray(data.entrustedList, isBitgetOrder);
        return [];
    }

    private createClientOid(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }

    private normalizeRestInterval(interval: string): string {
        const map: Record<string, string> = {
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

