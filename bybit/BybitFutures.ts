import BybitStreams from "./BybitStreams";
import { IExchangeClient } from "../core/IExchangeClient";
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
    OrderInput,
    OrderSide,
    OrderType,
    TimeInForce,
    PositionDirection
} from "../core/types";
import { convertBybitKline, convertBybitOrder, convertBybitPosition, convertExchangeInfo } from "./converters";

export default class BybitFutures extends BybitStreams implements IExchangeClient {

    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: "Not applicable for Bybit V5" });
    }

    async getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>> {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/instruments-info', { category: 'linear' });
        if (res.success && res.data) {
            const info = convertExchangeInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/orderbook', {
            category: 'linear',
            symbol: params.symbol,
            limit: params.limit || 50
        });

        if (res.success && res.data) {
            const data = res.data as any;
            const { s, b, a, u } = data; // s: symbol, b: bids, a: asks
            return this.formattedResponse({
                data: {
                    symbol: s,
                    bids: b, // Bybit returns as [[price, size], ...] strings
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
            category: 'linear',
            symbol: params.symbol,
            interval: interval,
            limit: params.limit || 200
        };
        if (params.startTime) query.start = params.startTime;
        if (params.endTime) query.end = params.endTime;

        const res = await this.publicRequest('linear', 'GET', '/v5/market/kline', query);
        const data = res.data as any;

        if (res.success && data && data.list) {
            const klines = data.list.map((item: string[]) => convertBybitKline(item, params.symbol));
            klines.reverse();
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest('linear', 'GET', '/v5/market/recent-trade', {
            category: 'linear',
            symbol: params.symbol,
            limit: params.limit || 500
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
        const res = await this.signedRequest('linear', 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
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
        const res = await this.signedRequest('linear', 'GET', '/v5/position/list', { category: 'linear', settleCoin: 'USDT' });
        const data = res.data as any;

        if (res.success && data && data.list) {
            const result: PositionRiskData[] = data.list.map((p: any) => {
                let dir: PositionDirection = 'LONG';
                if (p.side === 'Sell' || p.positionIdx === 2) dir = 'SHORT';

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
                    positionSide: dir === 'LONG' ? 'LONG' : 'SHORT',
                    notionalValue: parseFloat(p.positionValue),
                    maxNotionalValue: 0,
                    isAutoAddMargin: p.autoAddMargin === 1,
                    updateTime: parseInt(p.updatedTime)
                } as PositionRiskData;
            });
            return this.formattedResponse({ data: result });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        const riskRes = await this.getPositionRisk();
        if (riskRes.success && riskRes.data) {
            const positions: PositionData[] = riskRes.data
                .filter((p: PositionRiskData) => p.positionAmount !== 0)
                .map((p: PositionRiskData) => ({
                    symbol: p.symbol,
                    positionAmount: p.positionAmount,
                    entryPrice: p.entryPrice,
                    positionDirection: (p.positionAmount > 0 ? "LONG" : "SHORT") as PositionDirection,
                    isInPosition: true,
                    unrealizedPnL: p.unrealizedPnL
                }));
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: riskRes.errors });
    }

    async getOpenPositionBySymbol(params: { symbol: string; }): Promise<FormattedResponse<PositionData>> {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            const pos = res.data.find(p => p.symbol === params.symbol);
            if (pos) return this.formattedResponse({ data: pos });
            return this.formattedResponse({ errors: "Position not found" });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>> {
        const query: any = { category: 'linear', limit: 50 };
        if (symbol) query.symbol = symbol;
        else query.settleCoin = 'USDT'; // Required for linear if symbol is not provided

        const res = await this.signedRequest('linear', 'GET', '/v5/order/realtime', query);
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
        const res = await this.signedRequest('linear', 'POST', '/v5/order/cancel-all', {
            category: 'linear',
            symbol: params.symbol
        });
        return res;
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        const payload: any = {
            category: 'linear',
            symbol: params.symbol,
        };
        if (params.clientOrderId) payload.orderLinkId = params.clientOrderId;

        return await this.signedRequest('linear', 'POST', '/v5/order/cancel', payload);
    }

    // --- Order Execution ---

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const {
            symbol,
            side,
            type,
            quantity,
            price,
            triggerPrice,
            timeInForce = 'GTC',
            reduceOnly = false,
            closePosition = false,
            workingType = 'CONTRACT_PRICE'
        } = orderInput;

        // Verify if we can construct a clientOrderID to track this order
        const orderLinkId = `bybit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const payload: any = {
            category: 'linear',
            symbol,
            side: side === 'BUY' ? 'Buy' : 'Sell',
            orderType: type === 'MARKET' ? 'Market' : 'Limit',
            qty: quantity?.toString(),
            timeInForce: timeInForce,
            orderLinkId: orderLinkId, // Sent to Bybit to enable cancellation by clientOrderId
            reduceOnly: reduceOnly,
            closeOnTrigger: closePosition
        };

        if (price) payload.price = price.toString();

        if (triggerPrice) {
            payload.triggerPrice = triggerPrice.toString();
            if (workingType === 'MARK_PRICE') payload.triggerBy = 'MarkPrice';
            else if (workingType === 'CONTRACT_PRICE') payload.triggerBy = 'LastPrice';
        }

        const res = await this.signedRequest('linear', 'POST', '/v5/order/create', payload);

        if (res.success && res.data) {
            const data: OrderRequestResponse = {
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

    async marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'BUY',
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
        });
    }

    async marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: params.reduceOnly
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
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: undefined,
            price: params.price,
            triggerPrice: params.price,
            closePosition: true
        });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'MARKET',
            quantity: params.quantity,
            triggerPrice: params.price,
            reduceOnly: true
        });
    }

    async reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'LIMIT',
            quantity: params.quantity,
            price: params.price,
            reduceOnly: true
        });
    }

    async reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        const side = params.positionDirection === 'LONG' ? 'SELL' : 'BUY';
        return this.customOrder({
            symbol: params.symbol,
            side: side,
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: true
        });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: "Trailing Stop Order not fully supported in Bybit V5 wrapper yet" });
    }

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        const res = await this.signedRequest('linear', 'GET', '/v5/execution/list', {
            category: 'linear',
            symbol: symbol,
            limit: 100
        });

        if (res.success && res.data && res.data.list) {
            const total = res.data.list.reduce((acc: number, curr: any) => acc + parseFloat(curr.closedPnl || '0'), 0);
            return this.formattedResponse({ data: total });
        }
        return this.formattedResponse({ errors: res.errors });
    }
}
