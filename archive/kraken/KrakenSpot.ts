import KrakenStreams from './KrakenStreams.js';
import { IExchangeClient } from '../core/IExchangeClient.js';
import {
    FormattedResponse,
    ExtractedInfo,
    GetStaticDepthParams,
    StaticDepth,
    KlineData,
    GetAggTradesParams,
    AggTradesData,
    GetFundingHistoryParams,
    FundingHistoryData,
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
} from '../core/types.js';
import {
    KrakenAssetPairsResult,
    KrakenDepthResult,
    KrakenOHLCResult,
    KrakenTradesResult,
    KrakenBalanceResult,
    KrakenOpenOrdersResult,
    KrakenAddOrderResult,
    KrakenCancelOrderResult,
    convertKrakenAssetPairsToExtractedInfo,
    convertKrakenOpenOrder
} from './converters.js';

export default class KrakenSpot extends KrakenStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<string>> {
        return this.formattedResponse({ data: 'Not applicable for Kraken' });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest<KrakenAssetPairsResult>('spot', 'GET', '/0/public/AssetPairs', { info: 'info' });
        if (res.success && res.data) {
            const info = convertKrakenAssetPairsToExtractedInfo(res.data);
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest<KrakenDepthResult>('spot', 'GET', '/0/public/Depth', {
            pair: params.symbol,
            count: params.limit ?? 100
        });

        if (res.success && res.data) {
            const key = Object.keys(res.data)[0];
            const book = res.data[key];
            if (book) {
                return this.formattedResponse({
                    data: {
                        lastUpdateId: Date.now(),
                        bids: book.bids.map(b => [b[0], b[1]]),
                        asks: book.asks.map(a => [a[0], a[1]])
                    }
                });
            }
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number; }): Promise<FormattedResponse<KlineData[]>> {
        const interval = this.normalizeInterval(params.interval);
        const query: Record<string, number | string | undefined> = {
            pair: params.symbol,
            interval
        };
        if (params.startTime) {
            query.since = Math.floor(params.startTime / 1000);
        }

        const res = await this.publicRequest<KrakenOHLCResult>('spot', 'GET', '/0/public/OHLC', query);
        if (res.success && res.data) {
            const key = Object.keys(res.data).find(k => k !== 'last');
            const entries = key ? res.data[key] : undefined;
            if (Array.isArray(entries)) {
                const klines = entries.map(item => ({
                    symbol: params.symbol,
                    time: item[0] * 1000,
                    open: parseFloat(item[1]),
                    high: parseFloat(item[2]),
                    low: parseFloat(item[3]),
                    close: parseFloat(item[4]),
                    volume: parseFloat(item[6]),
                    trades: item[7]
                }));
                return this.formattedResponse({ data: klines });
            }
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const query: Record<string, number | string | undefined> = {
            pair: params.symbol
        };
        if (params.startTime) {
            query.since = Math.floor(params.startTime * 1000000); // ms to ns
        }

        const res = await this.publicRequest<KrakenTradesResult>('spot', 'GET', '/0/public/Trades', query);
        if (res.success && res.data) {
            const key = Object.keys(res.data).find(k => k !== 'last');
            const trades = key ? res.data[key] : undefined;
            if (Array.isArray(trades)) {
                const mapped = trades.map((t, idx) => ({
                    symbol: params.symbol,
                    id: idx,
                    price: parseFloat(t[0]),
                    quantity: parseFloat(t[1]),
                    time: Math.floor(t[2] * 1000),
                    isBuyer: t[3] === 'b'
                }));
                return this.formattedResponse({ data: mapped });
            }
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getFundingHistory(_params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest<KrakenBalanceResult>('spot', 'POST', '/Balance');
        if (res.success && res.data) {
            const balances = Object.entries(res.data).map(([asset, balance]) => ({
                asset,
                balance,
                crossWalletBalance: balance,
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

    async getOpenPositionBySymbol(_params: { symbol: string; }): Promise<FormattedResponse<PositionData>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async getOpenOrders(): Promise<FormattedResponse<OrderData[]>> {
        const res = await this.signedRequest<KrakenOpenOrdersResult>('spot', 'POST', '/OpenOrders');
        if (res.success && res.data) {
            const orders = Object.entries(res.data.open ?? {}).map(([id, order]) => convertKrakenOpenOrder(id, order));
            return this.formattedResponse({ data: orders });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>> {
        const res = await this.getOpenOrders();
        if (res.success && res.data) {
            const filtered = res.data.filter(o => o.symbol === params.symbol);
            return this.formattedResponse({ data: filtered });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async cancelAllOpenOrders(_params: CancelAllOpenOrdersParams): Promise<FormattedResponse<KrakenCancelOrderResult>> {
        const res = await this.signedRequest<KrakenCancelOrderResult>('spot', 'POST', '/CancelAll');
        if (res.success) return this.formattedResponse({ data: res.data });
        return this.formattedResponse({ errors: res.errors });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<KrakenCancelOrderResult>> {
        const res = await this.signedRequest<KrakenCancelOrderResult>('spot', 'POST', '/CancelOrder', { txid: params.clientOrderId });
        if (res.success) return this.formattedResponse({ data: res.data });
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

    async stopOrder(_params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async stopMarketOrder(_params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reduceLimitOrder(_params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async reducePosition(_params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async trailingStopOrder(_params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const orderType = this.mapSpotOrderType(orderInput.type);
        const payload: Record<string, string | number | boolean> = {
            pair: orderInput.symbol,
            type: orderInput.side === 'BUY' ? 'buy' : 'sell',
            ordertype: orderType,
        };

        if (orderInput.quantity !== undefined) payload.volume = orderInput.quantity;
        if (orderInput.price !== undefined) payload.price = orderInput.price;
        if (orderInput.stopPrice !== undefined) payload.price2 = orderInput.stopPrice;
        if (orderInput.timeInForce) payload.timeinforce = orderInput.timeInForce.toLowerCase();

        const res = await this.signedRequest<KrakenAddOrderResult>('spot', 'POST', '/AddOrder', payload);
        if (res.success && res.data) {
            const orderId = res.data.txid?.[0] ?? '';
            return this.formattedResponse({
                data: {
                    orderId: orderId ? Number(orderId) || 0 : 0,
                    symbol: orderInput.symbol,
                    status: 'NEW',
                    clientOrderId: orderId,
                    price: orderInput.price?.toString() ?? '0',
                    avgPrice: '0',
                    origQty: orderInput.quantity?.toString() ?? '0',
                    executedQty: '0',
                    cumQuote: '0',
                    timeInForce: orderInput.timeInForce ?? 'GTC',
                    type: orderInput.type,
                    reduceOnly: false,
                    closePosition: false,
                    side: orderInput.side,
                    positionSide: 'BOTH',
                    stopPrice: orderInput.stopPrice?.toString(),
                    workingType: 'CONTRACT_PRICE',
                    priceProtect: false,
                    origType: orderInput.type
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getLatestPnlBySymbol(_symbol: string): Promise<FormattedResponse<number>> {
        return this.formattedResponse({ errors: 'Not applicable for spot trading' });
    }

    private normalizeInterval(interval: string): number {
        const map: Record<string, number> = {
            '1m': 1,
            '5m': 5,
            '15m': 15,
            '30m': 30,
            '1h': 60,
            '4h': 240,
            '1d': 1440,
            '1w': 10080,
            '1M': 21600
        };
        return map[interval] ?? 1;
    }

    private mapSpotOrderType(type: OrderInput['type']): string {
        switch (type) {
            case 'MARKET':
                return 'market';
            case 'LIMIT':
                return 'limit';
            case 'STOP':
            case 'STOP_MARKET':
                return 'stop-loss';
            case 'TAKE_PROFIT':
            case 'TAKE_PROFIT_MARKET':
                return 'take-profit';
            case 'STOP_LOSS_LIMIT':
                return 'stop-loss-limit';
            case 'TAKE_PROFIT_LIMIT':
                return 'take-profit-limit';
            case 'TRAILING_STOP_MARKET':
                return 'trailing-stop';
            default:
                return 'limit';
        }
    }
}
