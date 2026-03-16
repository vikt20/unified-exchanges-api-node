import OkxStreams from "./OkxStreams.js";
import { IExchangeClient } from "../core/IExchangeClient.js";
import {
    FormattedResponse,
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
    OrderInput,
    ExtractedInfo
} from "../core/types.js";
import { convertExchangeInfo, convertOkxKline, convertOkxOrder } from "./converters.js";

export default class OkxSpot extends OkxStreams implements IExchangeClient {

    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest?: boolean) {
        super(apiKey, apiSecret, apiPassphrase, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: "Not applicable for OKX V5" });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest('public', 'GET', '/api/v5/public/instruments', { instType: 'SPOT' });
        if (res.success && res.data) {
            const info = convertExchangeInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/books', {
            instId: params.symbol,
            sz: params.limit || 400
        });

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const data = (res.data as any)[0];
            return this.formattedResponse({
                data: {
                    symbol: params.symbol,
                    bids: data.bids.map((b: string[]) => [b[0], b[1]]),
                    asks: data.asks.map((a: string[]) => [a[0], a[1]]),
                    lastUpdateId: parseInt(data.ts || '0')
                } as StaticDepth
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }


    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number; }): Promise<FormattedResponse<KlineData[]>> {
        let bar = this.normalizeOkxInterval(params.interval);

        const query: any = {
            instId: params.symbol,
            bar: bar,
            limit: params.limit || 1000
        };
        if (params.startTime) query.before = params.startTime;
        if (params.endTime) query.after = params.endTime;

        const res = await this.publicRequest('public', 'GET', '/api/v5/market/candles', query);

        if (res.success && res.data && Array.isArray(res.data)) {
            const klines = res.data.map((item: string[]) => convertOkxKline(item, params.symbol));
            klines.reverse();
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/trades', {
            instId: params.symbol,
            limit: params.limit || 100
        });

        if (res.success && res.data && Array.isArray(res.data)) {
            const trades: AggTradesData[] = res.data.map((t: any) => ({
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

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/balance');

        if (res.success && res.data && Array.isArray(res.data) && res.data[0] && res.data[0].details) {
            const details = res.data[0].details;

            const balances = details.map((c: any) => ({
                asset: c.ccy,
                balance: c.availBal || c.eq,
                crossWalletBalance: c.eq,
                balanceChange: '0'
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
        const query: any = { instType: 'SPOT' };
        if (symbol) query.instId = symbol;

        const res = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', query);

        if (res.success && res.data && Array.isArray(res.data)) {
            const orders = res.data.map(convertOkxOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>> {
        const pendingRes = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', { instId: params.symbol, instType: 'SPOT' });
        if (pendingRes.success && pendingRes.data && pendingRes.data.length > 0) {
            const cancelPayloads = pendingRes.data.map((order: any) => ({
                instId: params.symbol,
                ordId: order.ordId
            }));

            const chunks = [];
            for (let i = 0; i < cancelPayloads.length; i += 13) {
                chunks.push(cancelPayloads.slice(i, i + 13));
            }

            for (const chunk of chunks) {
                await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-batch-orders', chunk);
            }
        }
        return this.formattedResponse({ data: "Success" });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        const payload: any = {
            instId: params.symbol,
        };
        if (params.clientOrderId) payload.clOrdId = params.clientOrderId;

        return await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-order', payload);
    }

    // --- Order Execution ---

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const {
            symbol,
            side,
            type,
            quantity,
            price
        } = orderInput;

        const payload: any = {
            instId: symbol,
            tdMode: 'cash',
            side: side.toLowerCase(),
            ordType: type === 'MARKET' ? 'market' : 'limit',
            sz: quantity?.toString(),
        };

        if (price) payload.px = price.toString();

        const res = await this.signedRequest('private', 'POST', '/api/v5/trade/order', payload);

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const orderRes = res.data[0] as any;
            return this.formattedResponse({
                data: {
                    orderId: orderRes.ordId,
                    clientOrderId: orderRes.clOrdId,
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
