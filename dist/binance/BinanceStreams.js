import BinanceBase from "./BinanceBase.js";
import { convertBookTickerData, convertDepthData, convertFundingData, convertKlineData, convertTradeDataWebSocket, convertUserData } from "./converters.js";
import ws from 'ws';
import { BinanceWebsocketApiClient, BinanceWsUnavailableError } from "./BinanceWebsocketApi.js";
export default class BinanceStreams extends BinanceBase {
    constructor(apiKey, apiSecret, isTest = false, pingServer = false, useWebsocketApi = false) {
        super(apiKey, apiSecret, isTest, pingServer);
        this.useWebsocketApi = useWebsocketApi;
        if (this.useWebsocketApi === true || typeof this.useWebsocketApi === 'function')
            this.initTradingWsApiClient();
    }
    subscriptions = [];
    listenKeyInterval;
    useWebsocketApi = false;
    tradingWsApiClient = undefined;
    destroy() {
        this.destroyTradingWsApiClient();
        super.destroy();
    }
    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        clearInterval(this.listenKeyInterval);
        this.destroy();
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
        return this.handleWebSocket(createWs, convertUserData, callback, 'futuresUserDataStream()', statusCallback);
    }
    async fundingStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@markPrice`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures', 'market') + streams.join('/'));
        return this.handleWebSocket(createWs, convertFundingData, callback, 'fundingStream()', statusCallback);
    }
}
