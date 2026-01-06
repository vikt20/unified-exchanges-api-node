
import BybitStreams from "./BybitStreams.js";
import { IExchangeClient } from "../core/IExchangeClient.js";
import {
    FormattedResponse,
    ExchangeInfoData,
    GetStaticDepthParams,
    StaticDepth,
    KlineData,
    GetAggTradesParams,
    AggTradesData,
    AccountData,
    PositionRiskData,
    PositionData,
    OrderData,
    GetOpenOrdersBySymbolParams,
    CancelAllOpenOrdersParams,
    CancelOrderByIdParams,
    OrderRequestResponse,
    MarketOrderParams,
    LimitOrderParams,
    StopOrderParams,
    StopMarketOrderParams,
    ReduceOrderParams,
    ReducePositionParams,
    TrailingStopOrderParams,
    OrderInput
} from "../core/types.js";
import { convertBybitKline, convertBybitOrder, convertExchangeInfo } from "./converters.js";

export default class BybitSpot extends BybitStreams implements IExchangeClient {

    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean) {
        super(apiKey, apiSecret, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: "Not applicable for Bybit V5" });
    }

    async getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>> {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/instruments-info', { category: 'spot' });
        if (res.success && res.data) {
            const info = convertExchangeInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/orderbook', {
            category: 'spot',
            symbol: params.symbol,
            limit: params.limit || 50
        });

        if (res.success && res.data) {
            const data = res.data as any;
            const { s, b, a, u } = data;
            return this.formattedResponse({
                data: {
                    symbol: s,
                    bids: b,
                    asks: a,
                    lastUpdateId: parseInt(u || '0')
                } as StaticDepth
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number; }): Promise<FormattedResponse<KlineData[]>> {
        let interval = params.interval;
        if (interval === '1m') interval = '1';
        if (interval === '5m') interval = '5';
        if (interval === '15m') interval = '15';
        if (interval === '30m') interval = '30';
        if (interval === '1h') interval = '60';
        if (interval === '4h') interval = '240';
        if (interval === '1d') interval = 'D';

        const query: any = {
            category: 'spot',
            symbol: params.symbol,
            interval: interval,
            limit: params.limit || 200
        };
        if (params.startTime) query.start = params.startTime;
        if (params.endTime) query.end = params.endTime;

        const res = await this.publicRequest('spot', 'GET', '/v5/market/kline', query);
        const data = res.data as any;

        if (res.success && data && data.list) {
            const klines = data.list.map((item: string[]) => convertBybitKline(item, params.symbol));
            klines.reverse();
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest('spot', 'GET', '/v5/market/recent-trade', {
            category: 'spot',
            symbol: params.symbol,
            limit: params.limit || 60
        });
        const data = res.data as any;

        if (res.success && data && data.list) {
            const trades: AggTradesData[] = data.list.map((t: any) => ({
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

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest('spot', 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
        const data = res.data as any;

        if (res.success && data && data.list && data.list[0]) {
            const wallet = data.list[0];
            const coins = wallet.coin || [];
            const balances = coins.map((c: any) => ({
                asset: c.coin,
                balance: c.walletBalance,
                crossWalletBalance: c.walletBalance,
                balanceChange: 0
            }));
            return this.formattedResponse({ data: balances });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        return this.formattedResponse({ data: [] });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getOpenPositionBySymbol(params: { symbol: string; }): Promise<FormattedResponse<PositionData>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>> {
        const query: any = { category: 'spot', limit: 50 };
        if (symbol) query.symbol = symbol;

        const res = await this.signedRequest('spot', 'GET', '/v5/order/realtime', query);
        const data = res.data as any;

        if (res.success && data && data.list) {
            const orders = data.list.map(convertBybitOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>> {
        return await this.signedRequest('spot', 'POST', '/v5/order/cancel-all', {
            category: 'spot',
            symbol: params.symbol
        });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        const payload: any = {
            category: 'spot',
            symbol: params.symbol,
        };
        if (params.clientOrderId) payload.orderLinkId = params.clientOrderId;

        return await this.signedRequest('spot', 'POST', '/v5/order/cancel', payload);
    }

    // --- Order Execution ---

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const {
            symbol,
            side,
            type,
            quantity,
            price,
            timeInForce
        } = orderInput;

        const payload: any = {
            category: 'spot',
            symbol,
            side: side === 'BUY' ? 'Buy' : 'Sell',
            orderType: type === 'MARKET' ? 'Market' : 'Limit',
            qty: quantity?.toString(),
            timeInForce: timeInForce || 'GTC',
        };
        if (price) payload.price = price.toString();

        const res = await this.signedRequest('spot', 'POST', '/v5/order/create', payload);

        if (res.success && res.data) {
            return this.formattedResponse({
                data: {
                    orderId: res.data.orderId,
                    clientOrderId: res.data.orderLinkId,
                    symbol,
                    status: 'NEW' as any,
                    price: price?.toString() || '0',
                    origQty: quantity?.toString() || '0',
                    executedQty: '0',
                    side: side,
                    type: type
                } as any
            });
        }
        return this.formattedResponse({ errors: res.errors });
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
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }
}
