import KrakenStreams from './KrakenStreams.js';
import { IFuturesExchangeClient } from '../core/IExchangeClient.js';
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
    PositionSide,
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
    SymbolLeverageData,
    SymbolMarginModeData,
    MarginMode
} from '../core/types.js';
import {
    KrakenFuturesInstrumentsResponse,
    KrakenFuturesOrderBookResponse,
    KrakenFuturesTradeHistoryResponse,
    KrakenFuturesTickersResponse,
    KrakenFuturesOpenOrdersResponse,
    KrakenFuturesOpenPositionsResponse,
    KrakenFuturesAccountsResponse,
    KrakenFuturesCandlesResponse,
    KrakenFuturesOpenOrder,
    KrakenFuturesOpenPosition,
    KrakenFuturesTrade,
    mapKrakenFuturesInstrumentToExtractedInfo,
    convertKrakenFuturesOrder,
    convertKrakenFuturesPosition
} from './converters.js';

type KrakenFuturesFundingRatesResponse = {
    rates?: Array<{
        timestamp: string;
        fundingRate: number;
        relativeFundingRate: number;
    }>;
};

type KrakenSpotTickerResult = Record<string, {
    c?: [string, string];
}>;

export default class KrakenFutures extends KrakenStreams implements IFuturesExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

    async closeListenKey(): Promise<FormattedResponse<string>> {
        return this.formattedResponse({ data: 'Not applicable for Kraken Futures' });
    }

    async getExchangeInfo(): Promise<FormattedResponse<{ [key: string]: ExtractedInfo }>> {
        const res = await this.publicRequest<KrakenFuturesInstrumentsResponse>('futures', 'GET', '/instruments');
        if (res.success && res.data?.instruments) {
            const info: { [key: string]: ExtractedInfo } = {};
            for (const instrument of res.data.instruments) {
                info[instrument.symbol] = mapKrakenFuturesInstrumentToExtractedInfo(instrument);
            }
            return this.formattedResponse({ data: info });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>> {
        const res = await this.publicRequest<KrakenFuturesOrderBookResponse>('futures', 'GET', '/orderbook', { symbol: params.symbol });
        if (res.success && res.data?.orderBook) {
            const toTuple = (level: import('./converters.js').KrakenFuturesOrderBookLevel): [string, string] | null => {
                if (Array.isArray(level) && level.length >= 2) {
                    return [level[0].toString(), level[1].toString()];
                }
                if (!Array.isArray(level) && typeof level.price === 'number' && typeof level.qty === 'number') {
                    return [level.price.toString(), level.qty.toString()];
                }
                return null;
            };
            const bids = res.data.orderBook.bids.map(toTuple).filter((v): v is [string, string] => v !== null);
            const asks = res.data.orderBook.asks.map(toTuple).filter((v): v is [string, string] => v !== null);
            return this.formattedResponse({
                data: {
                    lastUpdateId: Date.now(),
                    bids,
                    asks
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getKlines(params: { symbol: string; interval: string; startTime?: number; endTime?: number; limit?: number; }): Promise<FormattedResponse<KlineData[]>> {
        const resolution = this.normalizeResolution(params.interval);
        const res = await this.publicRequest<KrakenFuturesCandlesResponse>(
            'futures-charts',
            'GET',
            `/trade/${params.symbol}/${resolution}`
        );
        if (res.success && res.data?.candles) {
            const klines = res.data.candles.map(c => ({
                symbol: params.symbol,
                time: Number(c.time),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Number(c.volume),
                trades: c.trades ?? 0
            }));
            return this.formattedResponse({ data: klines });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>> {
        const res = await this.publicRequest<KrakenFuturesTradeHistoryResponse>('futures', 'GET', '/history', {
            symbol: params.symbol,
            limit: params.limit
        });
        const trades: KrakenFuturesTrade[] | undefined = res.data?.elements ?? res.data?.trades;
        if (res.success && trades) {
            const mapped = trades.map((t, idx) => ({
                symbol: t.symbol ?? params.symbol,
                id: t.trade_id ?? idx,
                price: t.price,
                quantity: t.qty,
                time: t.time,
                isBuyer: t.side === 'buy'
            }));
            return this.formattedResponse({ data: mapped });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getFundingHistory(params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>> {
        const res = await this.publicRequest<KrakenFuturesFundingRatesResponse>(
            'futures',
            'GET',
            '/historical-funding-rates',
            { symbol: params.symbol }
        );

        if (res.success && res.data?.rates) {
            let history = res.data.rates.map(rate => ({
                symbol: params.symbol,
                fundingTime: Date.parse(rate.timestamp),
                rate: Number(rate.relativeFundingRate)
            }));

            if (params.startTime !== undefined) {
                history = history.filter(item => item.fundingTime >= params.startTime!);
            }
            if (params.endTime !== undefined) {
                history = history.filter(item => item.fundingTime <= params.endTime!);
            }

            const limit = params.limit ?? 100;
            if (limit === 0) {
                history = [];
            } else if (limit > 0 && history.length > limit) {
                history = params.startTime === undefined
                    ? history.slice(-limit)
                    : history.slice(0, limit);
            }

            return this.formattedResponse({ data: history });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getBalance(): Promise<FormattedResponse<AccountData['balances']>> {
        const res = await this.signedRequest<KrakenFuturesAccountsResponse>('futures', 'GET', '/accounts');
        if (res.success && res.data?.accounts) {
            const cashBalances = res.data.accounts.cash?.balances;
            if (!cashBalances) {
                return this.formattedResponse({ errors: 'Kraken Futures cash account balances not found' });
            }

            const converted = await this.convertCashBalancesToUsdt(cashBalances);
            if (converted.errors !== undefined) {
                return this.formattedResponse({ errors: converted.errors });
            }

            const balance = String(converted.data ?? 0);
            return this.formattedResponse({
                data: [{
                    asset: 'USDT',
                    balance,
                    crossWalletBalance: balance,
                    balanceChange: '0'
                }]
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getSymbolLeverage({ symbol }: { symbol: string }): Promise<FormattedResponse<SymbolLeverageData>> {
        const positions = await this.getPositionRisk();
        if (!positions.success || !positions.data) return this.formattedResponse({ errors: positions.errors });
        const position = positions.data.find(item => item.symbol === symbol);
        return this.formattedResponse({ data: { symbol, leverage: position?.leverage ?? 0, maxLeverage: 0 } });
    }

    async updateSymbolLeverage({ symbol }: { symbol: string; leverage: number }): Promise<FormattedResponse<SymbolLeverageData>> {
        return this.formattedResponse({ errors: `Kraken Futures does not expose symbol-level leverage updates for ${symbol}` });
    }

    async getSymbolMarginMode({ symbol }: { symbol: string }): Promise<FormattedResponse<SymbolMarginModeData>> {
        const positions = await this.getPositionRisk();
        if (!positions.success || !positions.data) return this.formattedResponse({ errors: positions.errors });
        const position = positions.data.find(item => item.symbol === symbol);
        return this.formattedResponse({ data: { symbol, marginMode: position?.marginType ?? 'cross' } });
    }

    async updateSymbolMarginMode({ symbol }: { symbol: string; marginMode: MarginMode }): Promise<FormattedResponse<SymbolMarginModeData>> {
        return this.formattedResponse({ errors: `Kraken Futures does not expose symbol-level margin-mode updates for ${symbol}` });
    }

    async getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>> {
        const res = await this.signedRequest<KrakenFuturesOpenPositionsResponse>('futures', 'GET', '/openpositions');
        if (res.success && res.data?.openPositions) {
            const positions = res.data.openPositions.map((p: KrakenFuturesOpenPosition) => ({
                symbol: p.symbol,
                positionAmount: p.size,
                entryPrice: p.entryPrice ?? 0,
                markPrice: p.markPrice ?? 0,
                unrealizedPnL: p.unrealizedPnl ?? 0,
                liquidationPrice: p.liquidationPrice ?? 0,
                leverage: p.leverage ?? 0,
                marginType: p.marginType ?? 'cross',
                isolatedMargin: 0,
                positionSide: (p.side === 'short' ? 'SHORT' : 'LONG') as PositionSide,
                notionalValue: 0,
                maxNotionalValue: 0,
                isAutoAddMargin: false,
                updateTime: Date.now()
            }));
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>> {
        const res = await this.signedRequest<KrakenFuturesOpenPositionsResponse>('futures', 'GET', '/openpositions');
        if (res.success && res.data?.openPositions) {
            const positions = res.data.openPositions.map(convertKrakenFuturesPosition);
            return this.formattedResponse({ data: positions });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenPositionBySymbol(params: { symbol: string; }): Promise<FormattedResponse<PositionData>> {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            const position = res.data.find(p => p.symbol === params.symbol);
            if (position) return this.formattedResponse({ data: position });
            return this.formattedResponse({ errors: 'Position not found' });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getOpenOrders(): Promise<FormattedResponse<OrderData[]>> {
        const res = await this.signedRequest<KrakenFuturesOpenOrdersResponse>('futures', 'GET', '/openorders');
        if (res.success && res.data?.openOrders) {
            const orders = res.data.openOrders.map(convertKrakenFuturesOrder);
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

    async cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<{ result?: string; error?: string }>> {
        const res = await this.signedRequest<{ result?: string; error?: string }>('futures', 'POST', '/cancelallorders', {
            symbol: params.symbol
        });
        if (res.success) return this.formattedResponse({ data: res.data });
        return this.formattedResponse({ errors: res.errors });
    }

    async cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<{ result?: string; error?: string }>> {
        const res = await this.signedRequest<{ result?: string; error?: string }>('futures', 'POST', '/cancelorder', {
            order_id: params.clientOrderId
        });
        if (res.success) return this.formattedResponse({ data: res.data });
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
            stopPrice: params.price,
            reduceOnly: true
        });
    }

    async stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'STOP_MARKET',
            quantity: params.quantity,
            stopPrice: params.price
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
            side,
            type: 'MARKET',
            quantity: params.quantity,
            reduceOnly: true
        });
    }

    async trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>> {
        return this.customOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'TRAILING_STOP_MARKET',
            quantity: params.quantity,
            callbackRate: params.callbackRate,
            activatePrice: params.activatePrice
        });
    }

    async customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>> {
        const payload: Record<string, string | number | boolean> = {
            symbol: orderInput.symbol,
            side: orderInput.side === 'BUY' ? 'buy' : 'sell',
            orderType: this.mapFuturesOrderType(orderInput.type),
            size: orderInput.quantity ?? 0
        };

        if (orderInput.price !== undefined) payload.limitPrice = orderInput.price;
        if (orderInput.stopPrice !== undefined) payload.stopPrice = orderInput.stopPrice;
        if (orderInput.triggerPrice !== undefined) payload.stopPrice = orderInput.triggerPrice;
        if (orderInput.reduceOnly !== undefined) payload.reduceOnly = orderInput.reduceOnly;
        if (orderInput.callbackRate !== undefined) payload.trailingStop = orderInput.callbackRate;

        const res = await this.signedRequest<{ order_id?: string; result?: string; error?: string }>('futures', 'POST', '/sendorder', payload);
        if (res.success) {
            const orderId = res.data?.order_id ?? '';
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
                    reduceOnly: orderInput.reduceOnly ?? false,
                    closePosition: orderInput.closePosition ?? false,
                    side: orderInput.side,
                    positionSide: 'BOTH',
                    stopPrice: orderInput.stopPrice?.toString(),
                    workingType: orderInput.workingType ?? 'CONTRACT_PRICE',
                    priceProtect: false,
                    origType: orderInput.type
                }
            });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    async getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>> {
        const res = await this.signedRequest<KrakenFuturesOpenPositionsResponse>('futures', 'GET', '/openpositions');
        if (res.success && res.data?.openPositions) {
            const match = res.data.openPositions.find(p => p.symbol === symbol);
            if (match) return this.formattedResponse({ data: match.unrealizedPnl ?? 0 });
            return this.formattedResponse({ errors: 'Position not found' });
        }
        return this.formattedResponse({ errors: res.errors });
    }

    private async convertCashBalancesToUsdt(cashBalances: Record<string, number | string>): Promise<FormattedResponse<number>> {
        let total = 0;
        const spotRateCache = new Map<string, number | undefined>();
        const getRate = async (pair: string): Promise<number | undefined> => {
            if (spotRateCache.has(pair)) return spotRateCache.get(pair);
            const rate = await this.getSpotLastPrice(pair);
            spotRateCache.set(pair, rate);
            return rate;
        };

        for (const [currency, rawBalance] of Object.entries(cashBalances)) {
            const quantity = Number(rawBalance);
            if (!Number.isFinite(quantity) || quantity === 0) continue;

            const normalizedCurrency = this.normalizeCashCurrency(currency);
            if (normalizedCurrency === 'USDT') {
                total += quantity;
                continue;
            }

            const directRate = await getRate(`${normalizedCurrency}USDT`);
            if (directRate !== undefined) {
                total += quantity * directRate;
                continue;
            }

            const usdValue = normalizedCurrency === 'USD'
                ? quantity
                : await this.valueCashBalanceInUsd(normalizedCurrency, quantity, getRate);
            if (usdValue === undefined) {
                return this.formattedResponse({ errors: `Unable to convert Kraken Futures cash balance ${currency} to USDT` });
            }

            const usdtUsdRate = await getRate('USDTUSD');
            if (usdtUsdRate === undefined || usdtUsdRate === 0) {
                return this.formattedResponse({ errors: 'Unable to retrieve USDT/USD conversion price from Kraken' });
            }
            total += usdValue / usdtUsdRate;
        }

        return this.formattedResponse({ data: total });
    }

    private async valueCashBalanceInUsd(
        currency: string,
        quantity: number,
        getRate: (pair: string) => Promise<number | undefined>
    ): Promise<number | undefined> {
        const rate = await getRate(`${currency}USD`);
        return rate === undefined ? undefined : quantity * rate;
    }

    private async getSpotLastPrice(pair: string): Promise<number | undefined> {
        const res = await this.publicRequest<KrakenSpotTickerResult>('spot', 'GET', '/0/public/Ticker', { pair });
        if (!res.success || !res.data) return undefined;

        const ticker = Object.values(res.data)[0];
        const lastPrice = ticker?.c?.[0];
        if (lastPrice === undefined) return undefined;

        const price = Number(lastPrice);
        return Number.isFinite(price) ? price : undefined;
    }

    private normalizeCashCurrency(currency: string): string {
        const normalized = currency.toUpperCase();
        if (normalized === 'BTC') return 'XBT';
        if (normalized === 'DOGE') return 'XDG';
        return normalized;
    }

    private normalizeResolution(interval: string): string {
        const map: Record<string, string> = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1w'
        };
        return map[interval] ?? '1m';
    }

    private mapFuturesOrderType(type: OrderInput['type']): string {
        switch (type) {
            case 'MARKET':
                return 'mkt';
            case 'LIMIT':
                return 'lmt';
            case 'STOP':
            case 'STOP_MARKET':
                return 'stp';
            case 'TAKE_PROFIT':
            case 'TAKE_PROFIT_MARKET':
                return 'take_profit';
            case 'TRAILING_STOP_MARKET':
                return 'trailing_stop';
            default:
                return 'lmt';
        }
    }
}
