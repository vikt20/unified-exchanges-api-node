import BinanceBase from "./BinanceBase.js";
import { convertTradeDataWebSocket, convertDepthData, convertKlineData, convertUserData, convertBookTickerData, convertFundingData } from "./converters.js";
import ws from 'ws';
export default class BinanceStreams extends BinanceBase {
    constructor(apiKey, apiSecret, isTest = false, pingServer = false) {
        super(apiKey, apiSecret, isTest, pingServer);
    }
    subscriptions = [];
    listenKeyInterval;
    closeAllSockets() {
        // Disconnect all sockets
        this.subscriptions.forEach(sub => sub.disconnect());
        // Clear the subscriptions array
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
    /**
     * @param createWs - function to create webSocket connection
     * @param parser - convertation function
     * @param callback - function to handle data
     * @param title
     * @returns object with webSocket, id and setIsKeepAlive function
     */
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
            console.log(`Disconnecting manually Websocket ${title}`);
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
                    // Retry after delay for subsequent failures
                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                    return;
                }
                currentWs.on('message', (data) => {
                    try {
                        callback(parser(JSON.parse(data)));
                    }
                    catch (e) {
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
                    statusCallback?.('OPEN');
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });
                currentWs.on('close', (code, reason) => {
                    // Don't reconnect if manually disconnected
                    if (!isActive) {
                        console.log(`WebSocket manually closed for ${title}`);
                        return;
                    }
                    // Reconnect after delay for any close event
                    console.log(`${title} - WebSocket closed for ${title} - (code: ${code}), reconnecting in ${RECONNECT_DELAY}ms`);
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
                    // For subsequent errors, the close event will handle reconnection
                });
            };
            connect();
        });
    }
    // keep listen key alive by ping every 30min
    keepAliveListenKeyByInterval = (type) => {
        clearInterval(this.listenKeyInterval);
        this.listenKeyInterval = setInterval(() => this.keepAliveListenKey(type), 30 * 60 * 1000);
    };
    //subscribe to spot depth stream
    spotDepthStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'spotDepthStream()', statusCallback);
    }
    //subscribe to futures depth stream
    futuresDepthStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures') + streams.join('/'));
        return this.handleWebSocket(createWs, convertDepthData, callback, 'futuresDepthStream()', statusCallback);
    }
    spotCandleStickStream(symbols, interval, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'spotCandleStickStream()', statusCallback);
    }
    futuresCandleStickStream(symbols, interval, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures') + streams.join('/'));
        return this.handleWebSocket(createWs, convertKlineData, callback, 'futuresCanldeStickStream()', statusCallback);
    }
    futuresBookTickerStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'futuresBookTickerStream()', statusCallback);
    }
    spotBookTickerStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(this.getCombinedStreamUrl('spot') + streams.join('/'));
        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'spotBookTickerStream()', statusCallback);
    }
    async futuresTradeStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures') + streams.join('/'));
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
            return Promise.reject();
        }
        // send ping every 30min to keep listenKey alive
        this.keepAliveListenKeyByInterval('futures');
        const createWs = () => new ws(this.getStreamUrl('futures') + listenKey.data.listenKey);
        return this.handleWebSocket(createWs, convertUserData, callback, 'futuresUserDataStream()', statusCallback);
    }
    async fundingStream(symbols, callback, statusCallback) {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@markPrice`);
        const createWs = () => new ws(this.getCombinedStreamUrl('futures') + streams.join('/'));
        return this.handleWebSocket(createWs, convertFundingData, callback, 'fundingStream()', statusCallback);
    }
}
