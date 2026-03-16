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

export default class OkxFutures extends OkxStreams implements IExchangeClient {

    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, apiPassphrase, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<unknown>> {
        return this.formattedResponse({ data: "Not applicable for OKX V5" });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest('public', 'GET', '/api/v5/public/instruments', { instType: 'SWAP' });
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
            const data = res.data[0] as any;
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
        // Map interval to OKX bar: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M, 3M, 6M, 1Y
        let bar = this.normalizeOkxInterval(params.interval);

        const query: any = {
            instId: params.symbol,
            bar: bar,
            limit: params.limit || 1000
        };
        // OKX uses after/before in ms for pagination
        if (params.startTime) query.before = params.startTime;
        if (params.endTime) query.after = params.endTime;

        const res = await this.publicRequest('public', 'GET', '/api/v5/market/candles', query);

        if (res.success && res.data && Array.isArray(res.data)) {
            const klines = res.data.map((item: string[]) => convertOkxKline(item, params.symbol));
            klines.reverse(); // Standardize chronological order
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
                balance: c.eq,
                crossWalletBalance: c.eq,
                balanceChange: '0'
            }));

            return this.formattedResponse({ data: balances });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/positions', { instType: 'SWAP' });

        if (res.success && res.data && Array.isArray(res.data)) {
            const result: PositionRiskData[] = res.data.map((p: any) => {
                let dir = "LONG";
                if (p.posSide === "net") {
                    dir = parseFloat(p.pos) >= 0 ? "LONG" : "SHORT";
                } else if (p.posSide === "short") {
                    dir = "SHORT";
                }

                return {
                    symbol: p.instId,
                    positionAmount: Math.abs(parseFloat(p.pos)),
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
                    positionAmount: p.positionSide === 'LONG' ? p.positionAmount : -p.positionAmount,
                    entryPrice: p.entryPrice,
                    positionDirection: p.positionSide as any,
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
        const query: any = { instType: 'SWAP' };
        if (symbol) query.instId = symbol;

        const resNormal = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', query);
        const resAlgo = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-algo-pending', query);

        let merged: any[] = [];
        if (resNormal.success && resNormal.data) merged = merged.concat(resNormal.data);
        if (resAlgo.success && resAlgo.data) merged = merged.concat(resAlgo.data);

        if (resNormal.success || resAlgo.success) {
            const orders = merged.map(convertOkxOrder);
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: resNormal.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>> {
        // OKX requires cancelling up to 13 unexecuted orders in a batch, or we just rely on passing no ordId to cancel all?
        // Wait, OKX doesn't have a simple "Cancel All" endpoint for a symbol. 
        // We have to fetch all pending orders, map their IDs, and cancel in chunks.
        const pendingRes = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', { instId: params.symbol });
        if (pendingRes.success && pendingRes.data && pendingRes.data.length > 0) {
            const cancelPayloads = pendingRes.data.map((order: any) => ({
                instId: params.symbol,
                ordId: order.ordId
            }));

            // Max 13 per request for batch
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
        if (params.clientOrderId) payload.ordId = params.clientOrderId;

        // Note: algo orders use a different endpoint /api/v5/trade/cancel-algos
        // Standard orders:
        return await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-order', payload);
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
            reduceOnly = false,
            workingType = 'CONTRACT_PRICE'
        } = orderInput;

        // const clOrdId = `okx-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;
        const clOrdId = undefined

        let endpoint = '/api/v5/trade/order';
        const payload: any = {
            instId: symbol,
            tdMode: 'cross', // Simplification: assuming cross mode for single-currency accounts
            side: side.toLowerCase(),
            sz: quantity?.toString()
        };

        payload.reduceOnly = reduceOnly;

        if (type.includes('MARKET')) {
            payload.ordType = 'market';
        } else {
            payload.ordType = 'limit';
            if (price) payload.px = price.toString();
        }

        if (triggerPrice) {
            // Algo order
            endpoint = '/api/v5/trade/order-algo';
            payload.ordType = 'conditional';
            payload.algoClOrdId = clOrdId;
            delete payload.clOrdId;

            // default to Last price (CONTRACT_PRICE)
            let triggerPxType = 'last';
            if (workingType === 'MARK_PRICE') triggerPxType = 'mark';

            // Conditional algo orders require triggerPx/orderPx (not slTriggerPx/slOrdPx)
            payload.triggerPx = triggerPrice.toString();
            payload.triggerPxType = triggerPxType;
            if (type.includes('MARKET')) {
                payload.orderPx = '-1'; // market
            } else {
                if (price) {
                    payload.orderPx = price.toString();
                }
            }

        } else {
            payload.clOrdId = clOrdId;
        }

        const res = await this.signedRequest('private', 'POST', endpoint, payload);

        console.log(res);

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const orderRes = res.data[0] as any;
            const data: OrderRequestResponse = {
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
                type: type,
                reduceOnly: reduceOnly,
                closePosition: false,
                side: side,
                positionSide: 'BOTH',
                stopPrice: triggerPrice?.toString(),
                workingType: workingType,
                priceProtect: false,
                origType: type
            };
            return this.formattedResponse({ data });
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
            quantity: params.quantity,
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
            triggerPrice: params.price
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
        const payload: any = {
            instId: params.symbol,
            tdMode: 'cross',
            side: params.side.toLowerCase(),
            ordType: 'move_order_stop',
            sz: params.quantity.toString(),
            callbackRatio: (params.callbackRate / 100).toString()
        };

        if (params.activatePrice) {
            payload.activePx = params.activatePrice.toString();
        }

        const res = await this.signedRequest('private', 'POST', '/api/v5/trade/order-algo', payload);

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const data: OrderRequestResponse = {
                orderId: (res.data[0] as any).algoId,
                symbol: params.symbol,
                status: 'NEW',
                clientOrderId: (res.data[0] as any).algoClOrdId || '',
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

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        const res = await this.signedRequest('private', 'GET', '/api/v5/account/positions', { instId: symbol, instType: 'SWAP' });
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
            // "realized PnL" might be captured in pnl or upl
            const pnl = res.data.reduce((acc: number, val: any) => acc + parseFloat(val.pnl || '0'), 0);
            return this.formattedResponse({ data: pnl });
        }
        return this.formattedResponse({ errors: res.errors });
    }
}
