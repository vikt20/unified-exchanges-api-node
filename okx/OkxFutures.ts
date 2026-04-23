import OkxStreams from "./OkxStreams.js";
import { IExchangeClient } from "../core/IExchangeClient.js";
import Decimal from "decimal.js";

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

    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest: boolean = false, exchangeInfoFutures?: ExtractedInfo[]) {
        super(apiKey, apiSecret, apiPassphrase, isTest, exchangeInfoFutures);
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
        await this.assertInstrumentsReady();
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/books', {
            instId: params.symbol,
            sz: params.limit || 400
        });

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const data = res.data[0] as any;
            const convertSize = (sizeStr: string) => {
                const size = parseFloat(sizeStr);
                const converted = this.convertContractsToAssetSize(params.symbol, size);
                return (converted ?? size).toString();
            };
            return this.formattedResponse({
                data: {
                    symbol: params.symbol,
                    bids: data.bids.map((b: string[]) => [b[0], convertSize(b[1])]),
                    asks: data.asks.map((a: string[]) => [a[0], convertSize(a[1])]),
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
        await this.assertInstrumentsReady();
        const res = await this.publicRequest('public', 'GET', '/api/v5/market/trades', {
            instId: params.symbol,
            limit: params.limit || 100
        });

        if (res.success && res.data && Array.isArray(res.data)) {
            const trades: AggTradesData[] = res.data.map((t: any) => {
                const size = parseFloat(t.sz);
                const quantity = this.convertContractsToAssetSize(params.symbol, size) ?? size;
                return {
                    symbol: params.symbol,
                    id: parseInt(t.tradeId),
                    price: parseFloat(t.px),
                    quantity: quantity,
                    time: parseInt(t.ts),
                    isBuyer: t.side === 'buy'
                };
            });
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

                const positionContracts = Math.abs(parseFloat(p.pos));
                const positionAmount = this.convertContractsToAssetSize(p.instId, positionContracts) ?? positionContracts;

                return {
                    symbol: p.instId,
                    positionAmount: positionAmount,
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
        await this.assertInstrumentsReady();
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
        await this.assertInstrumentsReady();

        const query: any = { instType: 'SWAP' };
        if (symbol) query.instId = symbol;

        const resNormal = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-pending', query);
        const resAlgo = await this.signedRequest('private', 'GET', '/api/v5/trade/orders-algo-pending', { query, ...{ ordType: 'conditional' } });

        let merged: any[] = [];
        if (resNormal.success && resNormal.data) merged = merged.concat(resNormal.data);
        if (resAlgo.success && resAlgo.data) merged = merged.concat(resAlgo.data);

        if (resNormal.success && resAlgo.success) {
            const orders = merged.map(convertOkxOrder).map(o => ({
                ...o,
                originalQuantity: this.convertContractsToAssetSize(o.symbol, o.originalQuantity) ?? o.originalQuantity,
                orderLastFilledQuantity: this.convertContractsToAssetSize(o.symbol, o.orderLastFilledQuantity) ?? o.orderLastFilledQuantity,
                orderFilledAccumulatedQuantity: this.convertContractsToAssetSize(o.symbol, o.orderFilledAccumulatedQuantity) ?? o.orderFilledAccumulatedQuantity
            }));
            return this.formattedResponse({ data: orders });
        }
        const allErrors = `${resNormal.errors ? 'Orders normal: ' + resNormal.errors : ''} ${resAlgo.errors ? 'Orders algo: ' + resAlgo.errors : ''}`;
        return this.formattedResponse({ errors: allErrors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        return this.getOpenOrders(params.symbol);
    }

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown[]>> {
        // Fetch all algo order types (including trailing stop orders)
        const algoTypes: string[] = ['conditional', 'trigger', 'move_order_stop'];
        const promises: Promise<FormattedResponse<any>>[] = [
            this.signedRequest(
                'private',
                'GET',
                '/api/v5/trade/orders-pending',
                { instId: params.symbol }
            ),
            ...algoTypes.map((ordType: string) =>
                this.signedRequest(
                    'private',
                    'GET',
                    '/api/v5/trade/orders-algo-pending',
                    { instId: params.symbol, instType: 'SWAP', ordType }
                )
            )
        ];

        const responses: FormattedResponse<any>[] = await Promise.all(promises);
        const pendingRes: FormattedResponse<any> = responses[0];
        const algoResults: FormattedResponse<any>[] = responses.slice(1);

        // Merge all algo orders
        let allAlgoOrders: any[] = [];
        for (const res of algoResults) {
            if (res.success && Array.isArray(res.data)) {
                allAlgoOrders = allAlgoOrders.concat(res.data);
            }
        }

        if ((!pendingRes.success || !pendingRes.data?.length) && (!allAlgoOrders.length)) {
            return this.formattedResponse({ data: [] });
        }

        const cancelPayloads: { instId: string; ordId: string }[] = (pendingRes.data || []).map((order: any) => ({
            instId: params.symbol,
            ordId: order.ordId
        }));

        const algoCancelPayloads: { instId: string; algoId: string }[] = (allAlgoOrders || []).map((order: any) => ({
            instId: params.symbol,
            algoId: order.algoId
        }));

        const chunkSize = 20;
        const chunks: typeof cancelPayloads[] = [];
        const algoChunks: typeof algoCancelPayloads[] = [];

        for (let i = 0; i < cancelPayloads.length; i += chunkSize) {
            chunks.push(cancelPayloads.slice(i, i + chunkSize));
        }

        for (let i = 0; i < algoCancelPayloads.length; i += chunkSize) {
            algoChunks.push(algoCancelPayloads.slice(i, i + chunkSize));
        }

        const results: unknown[] = [];

        for (const chunk of chunks) {
            const res = await this.signedRequest(
                'private',
                'POST',
                '/api/v5/trade/cancel-batch-orders',
                chunk
            );

            if (res.success) results.push(...res.data);
        }

        for (const chunk of algoChunks) {
            const res = await this.signedRequest(
                'private',
                'POST',
                '/api/v5/trade/cancel-algos',
                chunk
            );

            if (res.success) results.push(...res.data);
        }

        return this.formattedResponse({ data: results });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>> {
        if (!params.clientOrderId) {
            return this.formattedResponse({ errors: 'order ID is required' });
        }

        const payload: any = {
            instId: params.symbol,
        };

        if (params.isAlgoOrder) {
            const algoPayload = [{ instId: params.symbol, algoId: params.clientOrderId }];
            return await this.signedRequest('private', 'POST', '/api/v5/trade/cancel-algos', algoPayload);
        }

        payload.ordId = params.clientOrderId;

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

        this.assertInstrumentsReady();
        const contractSize = this.convertAssetSizeToContracts(symbol, quantity);

        // const clOrdId = `okx-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;
        const clOrdId = undefined

        let endpoint = '/api/v5/trade/order';
        const payload: any = {
            instId: symbol,
            tdMode: 'cross', // Simplification: assuming cross mode for single-currency accounts
            side: side.toLowerCase(),
            sz: contractSize?.toString()
        };

        payload.reduceOnly = reduceOnly;

        const decimalCorrectedPrice = new (Decimal as any)(price?.toString() || "0");
        

        if (type.includes('MARKET')) {
            payload.ordType = 'market';
        } else {
            payload.ordType = 'limit';
            if (price) payload.px = decimalCorrectedPrice.toFixed();
        }

        if (triggerPrice) {
            const decimalTriggerPrice = new (Decimal as any)(triggerPrice?.toString() || "0");
            // Algo order
            endpoint = '/api/v5/trade/order-algo';
            payload.ordType = 'conditional';
            payload.algoClOrdId = clOrdId;
            delete payload.clOrdId;

            // default to Last price (CONTRACT_PRICE)
            let triggerPxType = 'last';
            if (workingType === 'MARK_PRICE') triggerPxType = 'mark';

            const isTakeProfit = type.includes('TAKE_PROFIT');
            const isStop = type.includes('STOP') || type.includes('STOP_LOSS');
            const isExitOrder = reduceOnly || orderInput.closePosition === true;

            if (isExitOrder && (isTakeProfit || isStop)) {
                payload.reduceOnly = true;
                if (isTakeProfit) {
                    payload.tpTriggerPx = decimalTriggerPrice.toFixed();
                    payload.tpTriggerPxType = triggerPxType;
                    payload.tpOrdPx = '-1'; // market
                } else {
                    payload.slTriggerPx = decimalTriggerPrice.toFixed();
                    payload.slTriggerPxType = triggerPxType;
                    payload.slOrdPx = '-1'; // market
                }
            } else {
                // For STOP orders (trigger market entry)
                // trigger algo orders require triggerPx/orderPx for entry triggers
                payload.ordType = 'trigger';
                payload.triggerPx = decimalTriggerPrice.toFixed();
                payload.triggerPxType = triggerPxType;
                if (type.includes('STOP')) {
                    payload.orderPx = '-1'; // market
                } else if (price) {
                    payload.orderPx = decimalCorrectedPrice.toFixed();
                }
            }

        } else {
            payload.clOrdId = clOrdId;
        }

        const res = await this.signedRequest('private', 'POST', endpoint, payload);

        console.log(`Raw order response:`, res);

        if (res.success && res.data && Array.isArray(res.data) && res.data[0]) {
            const orderRes = res.data[0] as any;
            const normalizedType = triggerPrice && !reduceOnly && orderInput.closePosition !== true && type === 'MARKET'
                ? 'STOP_MARKET'
                : type;
            const data: OrderRequestResponse = {
                orderId: orderRes.ordId || orderRes.algoId,
                symbol: symbol,
                status: 'NEW',
                clientOrderId: orderRes.clOrdId || orderRes.ordId || orderRes.algoClOrdId || clOrdId,
                price: decimalCorrectedPrice?.toFixed() || '0',
                avgPrice: '0',
                origQty: quantity?.toString() || '0',
                executedQty: '0',
                cumQuote: '0',
                timeInForce: 'GTC',
                type: normalizedType,
                reduceOnly: reduceOnly,
                closePosition: false,
                side: side,
                positionSide: 'BOTH',
                stopPrice: triggerPrice?.toString(),
                workingType: workingType,
                priceProtect: false,
                origType: normalizedType
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
            closePosition: true,
            reduceOnly: true
        });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'STOP',
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
        if (params.positionDirection === 'LONG') return await this.marketSell({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else if (params.positionDirection === 'SHORT') return await this.marketBuy({ symbol: params.symbol, quantity: params.quantity, reduceOnly: true });
        else return this.formattedResponse({ errors: 'Invalid position direction' });

        // close-position endpoint requires all "Close" orders to be closed before using it which creates latency in execution.
        // const payload = {
        //     instId: params.symbol,
        //     mgnMode: 'cross',
        //     posSide: 'net', //params.positionDirection.toLowerCase()
        //     ccy: 'USDT', //ccy 	String 	Conditional 	Margin currency, required in the case of closing cross MARGIN position for Futures mode.
        // }
        // const request = await this.signedRequest('private', 'POST', '/api/v5/trade/close-position', payload);
        // if (request.success) {
        //     return this.formattedResponse({ data: request.data });
        // }
        // return this.formattedResponse({ errors: request.errors });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        this.assertInstrumentsReady();
        const contractSize = this.convertAssetSizeToContracts(params.symbol, params.quantity);
        const payload: any = {
            instId: params.symbol,
            tdMode: 'cross',
            reduceOnly: true,
            side: params.side.toLowerCase(),
            ordType: 'move_order_stop',
            sz: contractSize?.toString(),
            callbackRatio: (params.callbackRate / 100).toString()
        };

        if (params.activatePrice) {
            const decimalCorrectedPrice = new (Decimal as any)(params.activatePrice.toString());
            payload.activePx = decimalCorrectedPrice.toFixed();
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
        const res = await this.signedRequest(
            'private',
            'GET',
            '/api/v5/account/positions-history',
            {
                instType: 'SWAP',
                instId: symbol,
                limit: 1
            }
        );

        if (!res.success) {
            return this.formattedResponse({
                errors: 'No closed positions found'
            });
        }

        // console.log(res.data)

        const latest = res.data[0];

        const pnl = Number(latest.realizedPnl ?? 0);

        return this.formattedResponse({ data: pnl });
    }
}
