import { IStreamManager } from "../core/IStreamManager.js";
import BinanceBase, { AccountData, FormattedResponse, OrderData, OrderStatus, OrderType, OrderWorkingType, PositionDirection, TimeInForce, Type } from "./BinanceBase.js";
import { convertBookTickerData, convertDepthData, convertFundingData, convertKlineData, convertTradeDataWebSocket, convertUserData } from "./converters.js";
import ws from 'ws';
import type { ExchangeInfoStreamCallback, ExchangeInfoStreamOptions, FundingData, FundingStreamOptions, UserData, IWebsocketApiClient, WebsocketApiOption } from "../core/types.js";
import { BinanceWebsocketApiClient, BinanceWsUnavailableError } from "./BinanceWebsocketApi.js";
import { createFundingIntervalCallback } from "../core/fundingInterval.js";

export type UserDataWebSocket = {
    e: UserData['event'],
    o?: OrderDataWebSocket | AlgoOrderDataWebSocket
    a?: AccountDataWebSocket
}

export type AccountDataWebSocket = {
    B: Array<{
        a: string,
        wb: string,
        cw: string,
        bc: string
    }>
    P: Array<{
        s: string,
        pa: string,
        ep: string,
        cr: string,
        up: string,
        mt: string,
        iw: string,
        ps: string
    }>
}

export type OrderDataWebSocket = {
    s: string,
    c: string,
    S: "BUY" | "SELL",
    o: OrderType,
    f: TimeInForce,
    q: string,
    p: string,
    ap: string,
    sp: string,
    x: OrderStatus,
    X: OrderStatus,
    i: number,
    l: string,
    z: string,
    L: string,
    n: string,
    N: string,
    T: number,
    t: number,
    b: string,
    a: string,
    m: boolean,
    R: boolean,
    wt: OrderWorkingType,
    ot: OrderType,
    ps: PositionDirection,
    cp: boolean,
    rp: string,
    pP: boolean,
    si: number,
    ss: number,
    V: string,
    pm: string,
    gtd: number,
    AP: string,
    cr: string
}

export type AlgoOrderDataWebSocket = {
    caid: string,
    aid: number,
    at: string,
    o: string,
    s: string,
    S: string,
    ps: string,
    f: string,
    q: string,
    X: OrderStatus,
    ai: string,
    ap: string,
    aq: string,
    act: string,
    tp: string,
    p: string,
    V: string,
    wt: string,
    pm: string,
    cp: boolean,
    pP: boolean,
    R: boolean,
    tt: number,
    gtd: number,
    rm: string
}

export type BookTickerDataWebSocket = {
    stream: string;
    data: {
        e: string;
        u: number;
        E: number;
        s: string;
        b: string;
        B: string;
        a: string;
        A: string;
    };
};

export type KlineDataWebSocket = {
    stream: string;
    data: {
        e: string;
        E: number;
        s: string;
        k: {
            t: number;
            T: number;
            s: string;
            i: string;
            f: number;
            L: number;
            o: string;
            c: string;
            h: string;
            l: string;
            v: string;
            n: number;
            x: boolean;
            q: string;
            V: string;
            Q: string;
            B: string;
        };
    };
};

export type DepthDataWebSocket = {
    stream: string;
    data: {
        e: string;
        E: number;
        s: string;
        U: number;
        u: number;
        b: Array<[string, string]>;
        a: Array<[string, string]>;
    };
};

export type DepthData = {
    symbol: string,
    asks: Array<[string, string]>,
    bids: Array<[string, string]>
}

export type KlineData = {
    symbol: string,
    time: number,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
    trades: number
}

export type BookTickerData = {
    symbol: string,
    bestBid: number,
    bestBidQty: number,
    bestAsk: number,
    bestAskQty: number
}

export type TradeDataWebSocket = {
    stream: string;
    data: {
        "e": "aggTrade",
        "E": 123456789,
        "s": "BTCUSDT",
        "a": 5933014,
        "p": "0.001",
        "q": "100",
        "f": 100,
        "l": 105,
        "T": 123456785,
        "m": true,
    };
}

export type TradeData = {
    symbol: string,
    price: number,
    quantity: number,
    tradeTime: number,
    orderType: 'BUY' | 'SELL',
}

export type HandleWebSocket = {
    disconnect: Function,
    id: string
}

export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG'

export type TradingWsRequestResult<T> =
    | { status: 'success'; response: FormattedResponse<T> }
    | { status: 'unavailable'; error: string };

export default class BinanceStreams extends BinanceBase implements IStreamManager {
    constructor(
        apiKey?: string,
        apiSecret?: string,
        isTest: boolean = false,
        useWebsocketApi: WebsocketApiOption<IWebsocketApiClient> = false
    ) {
        super(apiKey, apiSecret, isTest);
        this.useWebsocketApi = useWebsocketApi;
        if (this.useWebsocketApi === true || typeof this.useWebsocketApi === 'function') this.initTradingWsApiClient()
    }

    protected subscriptions: { id: string, disconnect: Function }[] = [];
    protected listenKeyInterval: NodeJS.Timeout | undefined;

    protected useWebsocketApi: WebsocketApiOption<IWebsocketApiClient> = false;
    protected tradingWsApiClient: IWebsocketApiClient | undefined = undefined;

    async futuresExchangeInfoStream(
        callback: ExchangeInfoStreamCallback,
        statusCallback?: (status: SocketStatus) => void,
        _options?: ExchangeInfoStreamOptions
    ): Promise<HandleWebSocket> {
        const createWs = () => new ws(`${this.getStreamUrl('futures', 'market')}!contractInfo`);
        return this.handleWebSocket(
            createWs,
            (event: { s?: string; cs?: string; dt?: number; [key: string]: unknown }) => ({
                symbol: event.s || '',
                status: event.cs,
                deliveryDate: Number(event.dt || 0),
                rawData: event
            }),
            callback,
            'futuresExchangeInfoStream()',
            statusCallback
        );
    }

    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        clearInterval(this.listenKeyInterval);
        this.destroyTradingWsApiClient();
    }

    closeById(id: string) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }

    protected isTradingWsApiConfigured(): boolean {
        return Boolean(this.tradingWsApiClient);
    }

    public getTradingWsApiClient(): () => IWebsocketApiClient | undefined {
        return () => this.tradingWsApiClient;
    }

    protected initTradingWsApiClient() {
        if (this.useWebsocketApi === true) {
            console.log(`Creating WebSocket API client`);
            this.tradingWsApiClient = this.createTradingWsApiClient();
        }

        if (typeof this.useWebsocketApi === 'function') {
            console.log(`Injecting WebSocket API client`);
            this.tradingWsApiClient = this.useWebsocketApi();
        }
    }

    protected async sendTradingWsRequest<T>(
        method: string,
        params: Record<string, any>,
        timeoutMs: number = 5000
    ): Promise<TradingWsRequestResult<T>> {
        const client = this.tradingWsApiClient;
        if (!client) {
            return { status: 'unavailable', error: 'WebSocket API is not configured' };
        }

        try {
            await client.ensureConnected();
        } catch (error: any) {
            return { status: 'unavailable', error: error?.message || 'WebSocket API is unavailable' };
        }

        if (!client.isOnline()) {
            return { status: 'unavailable', error: 'WebSocket API is not online' };
        }

        try {
            const response = await client.request<T>(method, params, { timeoutMs });
            return { status: 'success', response };
        } catch (error: any) {
            if (error instanceof BinanceWsUnavailableError) {
                return { status: 'unavailable', error: error.message };
            }
            return {
                status: 'success',
                response: this.formattedResponse({ errors: error?.message || 'WebSocket API request failed' })
            };
        }
    }

    protected destroyTradingWsApiClient(): void {
        // Don't destroy if client is provided externally
        if (typeof this.useWebsocketApi === 'function') {
            this.tradingWsApiClient = undefined;
            return;
        } 

        this.tradingWsApiClient?.destroy();
        this.tradingWsApiClient = undefined;
    }

    private createTradingWsApiClient(): IWebsocketApiClient {
        return new BinanceWebsocketApiClient({
            getUrl: () => this.getFuturesWsApiUrl(),
            getApiKey: () => this.apiKey,
            getRecvWindow: () => this.recvWindow,
            getTimestamp: () => Date.now() - this.timeOffset,
            sign: (queryString: string) => this.generateSignature(queryString),
            formattedResponse: <T>(object: { data?: T; errors?: string }) => this.formattedResponse(object)
        });
    }

    handleWebSocket(
        createWs: () => ws,
        parser: Function,
        callback: Function,
        title: string,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket> {
        title = `${this.exchange_id}:${title}`;
        const RECONNECT_DELAY = 3000;

        const id = Math.random().toString(36).substring(7);
        let isActive = true;
        let currentWs: ws | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }

            if (currentWs) {
                currentWs.removeAllListeners();
                currentWs.terminate();
                currentWs = null;
            }
        };

        const disconnect = () => {
            // console.log(`Disconnecting manually Websocket ${title}`);
            isActive = false;
            cleanup();
        };

        this.subscriptions.push({ id, disconnect });

        return new Promise((resolve, reject) => {
            let isInitialConnection = true;

            const connect = () => {
                if (!isActive) return;

                cleanup();

                try {
                    currentWs = createWs();
                } catch (e) {
                    console.error(`${title} - Failed to create WebSocket`);

                    if (isInitialConnection) {
                        isInitialConnection = false;
                        disconnect();
                        reject(e);
                        return;
                    }

                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                    return;
                }

                currentWs.on('message', (data: any) => {
                    try {
                        callback(parser(JSON.parse(data)));
                    } catch {
                        console.error(`${title} - Error parsing message`);
                    }
                });

                currentWs.on('ping', (data: any) => {
                    currentWs?.pong(data);
                });

                currentWs.on('pong', () => {
                    statusCallback?.('PONG');
                });

                currentWs.on('open', () => {
                    // console.log(`${title} - WebSocket connection opened`);
                    statusCallback?.('OPEN');

                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });

                currentWs.on('close', (code: number) => {
                    if (!isActive) {
                        // console.log(`WebSocket manually closed for ${title}`);
                        return;
                    }

                    console.log(`${title} - WebSocket closed (code: ${code}), reconnecting in ${RECONNECT_DELAY}ms`);
                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                });

                currentWs.on('error', (error: any) => {
                    console.error(`${title} - WebSocket error`);
                    statusCallback?.('ERROR');

                    if (isInitialConnection) {
                        isInitialConnection = false;
                        disconnect();
                        reject(error);
                    }
                });
            };

            connect();
        });
    }

    keepAliveListenKeyByInterval = (type: Type) => {
        clearInterval(this.listenKeyInterval);
        this.listenKeyInterval = setInterval(() => this.keepAliveListenKey(type), 30 * 60 * 1000);
    }

    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'spotDepthStream()', statusCallback);
    }

    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'public') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'futuresDepthStream()', statusCallback);
    }

    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'spotCandleStickStream()', statusCallback);
    }

    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'futuresCanldeStickStream()', statusCallback);
    }

    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'public') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'futuresBookTickerStream()', statusCallback);
    }

    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'spotBookTickerStream()', statusCallback);
    }

    async futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'futuresTradeStream()', statusCallback);
    }

    async spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'spotTradeStream()', statusCallback);
    }

    async futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const listenKey = await this.getFuturesListenKey();
        if (!listenKey.success || !listenKey.data) {
            console.log('Error getting listen key: ', listenKey.errors);
            return Promise.reject(listenKey.errors);
        }

        this.keepAliveListenKeyByInterval('futures');
        const createWs = () => new ws(`${this.getStreamUrl('futures', 'private')}?listenKey=${encodeURIComponent(listenKey.data!.listenKey)}&events=ORDER_TRADE_UPDATE/ACCOUNT_UPDATE/ALGO_UPDATE/listenKeyExpired`);
        return this.handleWebSocket(createWs, convertUserData, callback, 'futuresUserDataStream', statusCallback);
    }

    private fundingInfoHour?: number;
    private fundingInfoRequest?: Promise<Map<string, number>>;

    private async fetchFundingInterval(symbol: string): Promise<number | undefined> {
        const hour = Math.floor(Date.now() / (60 * 60 * 1000));
        if (this.fundingInfoHour !== hour || !this.fundingInfoRequest) {
            this.fundingInfoHour = hour;
            this.fundingInfoRequest = this.publicRequest('futures', 'GET', '/fapi/v1/fundingInfo')
                .then(response => {
                    if (!response.success || !Array.isArray(response.data)) {
                        throw new Error(response.errors || 'Failed to fetch Binance funding information');
                    }
                    const intervals = new Map<string, number>();
                    for (const item of response.data) {
                        const interval = Number(item.fundingIntervalHours);
                        if (typeof item.symbol === 'string' && Number.isFinite(interval) && interval > 0) {
                            intervals.set(item.symbol, interval);
                        }
                    }
                    return intervals;
                })
                .catch(error => {
                    this.fundingInfoRequest = undefined;
                    throw error;
                });
        }

        const intervals = await this.fundingInfoRequest;
        // fundingInfo lists adjusted symbols; symbols absent from it use Binance's standard 8-hour interval.
        return intervals.get(symbol) ?? 8;
    }

    async fundingStream(
        symbols: string[],
        callback: (data: FundingData) => void,
        statusCallback?: (status: SocketStatus) => void,
        options?: FundingStreamOptions
    ): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@markPrice`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        let isActive = true;
        const fundingCallback = createFundingIntervalCallback(
            callback,
            options?.fetchInterval === true,
            symbol => this.fetchFundingInterval(symbol),
            () => isActive
        );
        const handle = await this.handleWebSocket(createWs, convertFundingData, fundingCallback, 'fundingStream()', statusCallback);
        const disconnect = () => {
            isActive = false;
            handle.disconnect();
        };
        const subscription = this.subscriptions.find(item => item.id === handle.id);
        if (subscription) subscription.disconnect = disconnect;
        return {
            ...handle,
            disconnect
        };
    }
}
