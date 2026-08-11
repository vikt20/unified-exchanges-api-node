import BinanceBase from "./BinanceBase.js";
import { convertBookTickerData, convertDepthData, convertFundingData, convertKlineData, convertTradeDataWebSocket, convertUserData } from "./converters.js";
import ws from 'ws';
import { BinanceWebsocketApiClient, BinanceWsUnavailableError } from "./BinanceWebsocketApi.js";
import { createFundingIntervalCallback } from "../core/fundingInterval.js";
export default class BinanceStreams extends BinanceBase {
    constructor(apiKey, apiSecret, isTest = false, useWebsocketApi = false) {
        super(apiKey, apiSecret, isTest);
        this.useWebsocketApi = useWebsocketApi;
        if (this.useWebsocketApi === true || typeof this.useWebsocketApi === 'function')
            this.initTradingWsApiClient();
    }
    subscriptions = [];
    listenKeyInterval;
    useWebsocketApi = false;
    tradingWsApiClient = undefined;
    async futuresExchangeInfoStream(callback, statusCallback, _options) {
        const createWs = () => new ws(`${this.getStreamUrl('futures', 'market')}!contractInfo`);
        return this.handleWebSocket(createWs, (event) => ({
            symbol: event.s || '',
            status: event.cs,
            deliveryDate: Number(event.dt || 0),
            rawData: event
        }), callback, 'futuresExchangeInfoStream()', statusCallback);
    }
    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        clearInterval(this.listenKeyInterval);
        this.destroyTradingWsApiClient();
    }
    closeById(id) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }
    isTradingWsApiConfigured() {
        return Boolean(this.tradingWsApiClient);
    }
    getTradingWsApiClient() {
        return () => this.tradingWsApiClient;
    }
    initTradingWsApiClient() {
        if (this.useWebsocketApi === true) {
            console.log(`Creating WebSocket API client`);
            this.tradingWsApiClient = this.createTradingWsApiClient();
        }
        if (typeof this.useWebsocketApi === 'function') {
            console.log(`Injecting WebSocket API client`);
            this.tradingWsApiClient = this.useWebsocketApi();
        }
    }
    async sendTradingWsRequest(method, params, timeoutMs = 5000) {
        const client = this.tradingWsApiClient;
        if (!client) {
            return { status: 'unavailable', error: 'WebSocket API is not configured' };
        }
        try {
            await client.ensureConnected();
        }
        catch (error) {
            return { status: 'unavailable', error: error?.message || 'WebSocket API is unavailable' };
        }
        if (!client.isOnline()) {
            return { status: 'unavailable', error: 'WebSocket API is not online' };
        }
        try {
            const response = await client.request(method, params, { timeoutMs });
            return { status: 'success', response };
        }
        catch (error) {
            if (error instanceof BinanceWsUnavailableError) {
                return { status: 'unavailable', error: error.message };
            }
            return {
                status: 'success',
                response: this.formattedResponse({ errors: error?.message || 'WebSocket API request failed' })
            };
        }
    }
    destroyTradingWsApiClient() {
        // Don't destroy if client is provided externally
        if (typeof this.useWebsocketApi === 'function') {
            this.tradingWsApiClient = undefined;
            return;
        }
        this.tradingWsApiClient?.destroy();
        this.tradingWsApiClient = undefined;
    }
    createTradingWsApiClient() {
        return new BinanceWebsocketApiClient({
            getUrl: () => this.getFuturesWsApiUrl(),
            getApiKey: () => this.apiKey,
            getRecvWindow: () => this.recvWindow,
            getTimestamp: () => Date.now() - this.timeOffset,
            sign: (queryString) => this.generateSignature(queryString),
            formattedResponse: (object) => this.formattedResponse(object)
        });
    }
    handleWebSocket(createWs, parser, callback, title, statusCallback) {
        title = `${this.exchange_id}:${title}`;
        const RECONNECT_DELAY = 3000;
        const id = Math.random().toString(36).substring(7);
        let isActive = true;
        let currentWs = null;
        let reconnectTimeout = null;
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
                if (!isActive)
                    return;
                cleanup();
                try {
                    currentWs = createWs();
                }
                catch (e) {
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
                currentWs.on('message', (data) => {
                    try {
                        callback(parser(JSON.parse(data)));
                    }
                    catch {
                        console.error(`${title} - Error parsing message`);
                    }
                });
                currentWs.on('ping', (data) => {
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
                currentWs.on('close', (code) => {
                    if (!isActive) {
                        // console.log(`WebSocket manually closed for ${title}`);
                        return;
                    }
                    console.log(`${title} - WebSocket closed (code: ${code}), reconnecting in ${RECONNECT_DELAY}ms`);
                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                });
                currentWs.on('error', (error) => {
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
    keepAliveListenKeyByInterval = (type) => {
        clearInterval(this.listenKeyInterval);
        this.listenKeyInterval = setInterval(() => this.keepAliveListenKey(type), 30 * 60 * 1000);
    };
    spotDepthStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'spotDepthStream()', statusCallback);
    }
    futuresDepthStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'public') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'futuresDepthStream()', statusCallback);
    }
    spotCandleStickStream(symbols, interval, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'spotCandleStickStream()', statusCallback);
    }
    futuresCandleStickStream(symbols, interval, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'futuresCanldeStickStream()', statusCallback);
    }
    futuresBookTickerStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'public') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'futuresBookTickerStream()', statusCallback);
    }
    spotBookTickerStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'spotBookTickerStream()', statusCallback);
    }
    async futuresTradeStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'futuresTradeStream()', statusCallback);
    }
    async spotTradeStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'spotTradeStream()', statusCallback);
    }
    async futuresUserDataStream(callback, statusCallback) {
        const listenKey = await this.getFuturesListenKey();
        if (!listenKey.success || !listenKey.data) {
            console.log('Error getting listen key: ', listenKey.errors);
            return Promise.reject(listenKey.errors);
        }
        this.keepAliveListenKeyByInterval('futures');
        const createWs = () => new ws(`${this.getStreamUrl('futures', 'private')}?listenKey=${encodeURIComponent(listenKey.data.listenKey)}&events=ORDER_TRADE_UPDATE/ACCOUNT_UPDATE/ALGO_UPDATE/listenKeyExpired`);
        return this.handleWebSocket(createWs, convertUserData, callback, 'futuresUserDataStream', statusCallback);
    }
    fundingInfoHour;
    fundingInfoRequest;
    async fetchFundingInterval(symbol) {
        const hour = Math.floor(Date.now() / (60 * 60 * 1000));
        if (this.fundingInfoHour !== hour || !this.fundingInfoRequest) {
            this.fundingInfoHour = hour;
            this.fundingInfoRequest = this.publicRequest('futures', 'GET', '/fapi/v1/fundingInfo')
                .then(response => {
                if (!response.success || !Array.isArray(response.data)) {
                    throw new Error(response.errors || 'Failed to fetch Binance funding information');
                }
                const intervals = new Map();
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
    async fundingStream(symbols, callback, statusCallback, options) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@markPrice`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        let isActive = true;
        const fundingCallback = createFundingIntervalCallback(callback, options?.fetchInterval === true, symbol => this.fetchFundingInterval(symbol), () => isActive);
        const handle = await this.handleWebSocket(createWs, convertFundingData, fundingCallback, 'fundingStream()', statusCallback);
        const disconnect = () => {
            isActive = false;
            handle.disconnect();
        };
        const subscription = this.subscriptions.find(item => item.id === handle.id);
        if (subscription)
            subscription.disconnect = disconnect;
        return {
            ...handle,
            disconnect
        };
    }
}
