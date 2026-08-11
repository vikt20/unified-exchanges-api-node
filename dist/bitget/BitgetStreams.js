import ws from 'ws';
import BitgetBase from './BitgetBase.js';
import { createFundingIntervalCallback } from '../core/fundingInterval.js';
import { createExchangeInfoPollingStream } from '../core/exchangeInfoPolling.js';
import { convertBookTickerFromDepth, convertAlgoOrder, convertFunding, convertCandle, convertOrder, convertPosition, convertTicker, convertWsCandle, convertWsDepth, convertWsTrade, isBitgetOrder, isBitgetAlgoOrder, isBitgetWsAccount, isBitgetWsCandle, isBitgetWsDepth, isBitgetWsEvent, isBitgetWsPosition, isBitgetWsTicker, isBitgetWsTrade, isRecord, isBitgetCandle, toNumber } from './converters.js';
export default class BitgetStreams extends BitgetBase {
    subscriptions = [];
    futuresExchangeInfoStream(callback, statusCallback, options) {
        const client = this;
        return createExchangeInfoPollingStream(() => client.getExchangeInfo(), callback, subscription => this.subscriptions.push(subscription), statusCallback, options);
    }
    getTradingWsApiClient() {
        return () => undefined;
    }
    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
    }
    closeById(id) {
        const index = this.subscriptions.findIndex(sub => sub.id === id);
        if (index >= 0) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }
    handleWebSocket(url, args, parser, callback, title, statusCallback, auth = false) {
        title = `${this.exchange_id}:${title}`;
        const id = `bitget-${Math.random().toString(36).slice(2)}`;
        const reconnectDelay = 3000;
        const pingIntervalMs = 20000;
        let isActive = true;
        let currentWs = null;
        let reconnectTimer = null;
        let pingTimer = null;
        const cleanup = () => {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (pingTimer) {
                clearInterval(pingTimer);
                pingTimer = null;
            }
            if (currentWs) {
                currentWs.removeAllListeners();
                currentWs.terminate();
                currentWs = null;
            }
        };
        const disconnect = () => {
            isActive = false;
            cleanup();
        };
        this.subscriptions.push({ id, disconnect });
        return new Promise((resolve, reject) => {
            let firstConnection = true;
            const subscribe = () => {
                if (args.length === 0)
                    return;
                const message = { op: 'subscribe', args };
                currentWs?.send(JSON.stringify(message));
            };
            const connect = () => {
                if (!isActive)
                    return;
                cleanup();
                try {
                    currentWs = new ws(url);
                }
                catch (error) {
                    if (firstConnection) {
                        firstConnection = false;
                        reject(error);
                    }
                    reconnectTimer = setTimeout(connect, reconnectDelay);
                    return;
                }
                currentWs.on('open', () => {
                    statusCallback?.('OPEN');
                    if (auth) {
                        const timestamp = Math.floor((Date.now() - this.timeOffset) / 1000).toString();
                        const sign = this.generateSignature(`${timestamp}GET/user/verify`);
                        const login = {
                            op: 'login',
                            args: [{
                                    apiKey: this.apiKey,
                                    passphrase: this.apiPassphrase,
                                    timestamp,
                                    sign
                                }]
                        };
                        currentWs?.send(JSON.stringify(login));
                    }
                    else {
                        subscribe();
                    }
                    pingTimer = setInterval(() => {
                        if (currentWs?.readyState === ws.OPEN) {
                            currentWs.send('ping');
                            statusCallback?.('PING');
                        }
                    }, pingIntervalMs);
                    if (firstConnection) {
                        firstConnection = false;
                        resolve({ id, disconnect });
                    }
                });
                currentWs.on('message', (data) => {
                    const text = data.toString();
                    if (text === 'pong') {
                        statusCallback?.('PONG');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(text);
                        if (!isBitgetWsEvent(parsed))
                            return;
                        if (parsed.event === 'login') {
                            if (String(parsed.code) === '0')
                                subscribe();
                            else
                                statusCallback?.('AUTH_FAILED');
                            return;
                        }
                        if (parsed.event === 'subscribe')
                            return;
                        if (parsed.event === 'error') {
                            statusCallback?.('ERROR');
                            return;
                        }
                        const result = parser(parsed);
                        if (Array.isArray(result)) {
                            result.forEach(callback);
                        }
                        else if (result) {
                            callback(result);
                        }
                    }
                    catch {
                        return;
                    }
                });
                currentWs.on('close', () => {
                    statusCallback?.('CLOSE');
                    if (isActive)
                        reconnectTimer = setTimeout(connect, reconnectDelay);
                });
                currentWs.on('error', () => {
                    statusCallback?.('ERROR');
                });
            };
            connect();
        });
    }
    firstData(message, guard) {
        if (!Array.isArray(message.data))
            return undefined;
        return message.data.find(guard);
    }
    getSymbol(message) {
        return message.arg?.instId ?? '';
    }
    parseDepth = (message) => {
        const data = this.firstData(message, isBitgetWsDepth);
        if (!data)
            return undefined;
        return convertWsDepth(this.getSymbol(message), data);
    };
    parseKline = (message) => {
        if (Array.isArray(message.data)) {
            const candle = message.data.find(isBitgetCandle);
            if (candle)
                return convertCandle(candle, this.getSymbol(message));
        }
        const data = this.firstData(message, isBitgetWsCandle);
        if (!data)
            return undefined;
        return convertWsCandle(data, this.getSymbol(message));
    };
    parseTicker = (message) => {
        const data = this.firstData(message, isBitgetWsTicker);
        if (!data)
            return undefined;
        return convertTicker(data, this.getSymbol(message));
    };
    parseBookTicker = (message) => {
        const data = this.firstData(message, isBitgetWsDepth);
        if (!data)
            return undefined;
        return convertBookTickerFromDepth(data, this.getSymbol(message));
    };
    parseFunding = (message) => {
        const data = this.firstData(message, isBitgetWsTicker);
        if (!data)
            return undefined;
        return convertFunding(data, this.getSymbol(message));
    };
    parseTrade = (message) => {
        if (!Array.isArray(message.data))
            return undefined;
        return message.data
            .filter(isBitgetWsTrade)
            .map(trade => convertWsTrade(trade, this.getSymbol(message)));
    };
    publicArgs(instType, channel, symbols) {
        return symbols.map(symbol => ({ instType, channel, instId: symbol }));
    }
    spotDepthStream(symbols, callback, statusCallback, levels = 51) {
        const channel = levels <= 5 ? 'books5' : levels <= 50 ? 'books50' : 'books';
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', channel, symbols), this.parseDepth, callback, 'spotDepthStream', statusCallback);
    }
    futuresDepthStream(symbols, callback, statusCallback, levels = 51) {
        const channel = levels <= 5 ? 'books5' : levels <= 50 ? 'books50' : 'books';
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, channel, symbols), this.parseDepth, callback, 'futuresDepthStream', statusCallback);
    }
    spotCandleStickStream(symbols, interval, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', `candle${this.normalizeInterval(interval)}`, symbols), this.parseKline, callback, 'spotCandleStickStream', statusCallback);
    }
    futuresCandleStickStream(symbols, interval, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, `candle${this.normalizeInterval(interval)}`, symbols), this.parseKline, callback, 'futuresCandleStickStream', statusCallback);
    }
    spotBookTickerStream(symbols, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', 'books1', symbols), this.parseBookTicker, callback, 'spotBookTickerStream', statusCallback);
    }
    futuresBookTickerStream(symbols, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'books1', symbols), this.parseBookTicker, callback, 'futuresBookTickerStream', statusCallback);
    }
    spotTradeStream(symbols, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', 'trade', symbols), this.parseTrade, callback, 'spotTradeStream', statusCallback);
    }
    futuresTradeStream(symbols, callback, statusCallback) {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'trade', symbols), this.parseTrade, callback, 'futuresTradeStream', statusCallback);
    }
    async fetchFundingInterval(symbol) {
        const response = await this.publicRequest(this.productType, 'GET', '/api/v2/mix/market/funding-time', { symbol, productType: this.productType });
        const interval = Number(response.data?.[0]?.ratePeriod);
        return Number.isFinite(interval) && interval > 0 ? interval : undefined;
    }
    async fundingStream(symbols, callback, statusCallback, options) {
        let isActive = true;
        const fundingCallback = createFundingIntervalCallback(callback, options?.fetchInterval === true, symbol => this.fetchFundingInterval(symbol), () => isActive);
        const handle = await this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'ticker', symbols), this.parseFunding, fundingCallback, 'fundingStream', statusCallback);
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
    futuresUserDataStream(callback, statusCallback) {
        if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
            statusCallback?.('AUTH_FAILED');
            return Promise.reject(new Error('Bitget futures user data requires apiKey, apiSecret, and apiPassphrase'));
        }
        const args = [
            { instType: this.productType, channel: 'orders', instId: 'default' },
            { instType: this.productType, channel: 'orders-algo', instId: 'default' },
            { instType: this.productType, channel: 'positions', instId: 'default' },
            { instType: this.productType, channel: 'account', coin: 'default' }
        ];
        return this.handleWebSocket(this.getStreamUrl('private'), args, this.parseUserData, callback, 'futuresUserDataStream', statusCallback, true);
    }
    parseUserData = (message) => {
        const channel = message.arg?.channel;
        if (!Array.isArray(message.data))
            return undefined;
        // console.log('RAW User data message:', message);
        if (channel === 'orders') {
            const orderData = message.data.filter(isBitgetOrder).map(convertOrder);
            return { event: 'ORDER_TRADE_UPDATE', accountData: undefined, orderData, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' };
        }
        if (channel === 'orders-algo') {
            const orderData = message.data.filter(isBitgetAlgoOrder).map(convertAlgoOrder);
            return { event: 'ALGO_UPDATE', accountData: undefined, orderData, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' };
        }
        if (channel === 'positions') {
            // console.log('Raw Position:', message.data);
            const positions = message.data.filter(isBitgetWsPosition).map(convertPosition);
            return { event: 'ACCOUNT_UPDATE', accountData: { balances: undefined, positions }, orderData: undefined, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' };
        }
        if (channel === 'account') {
            // console.log('Raw Account:', message.data);
            const balances = message.data.filter(isBitgetWsAccount).map(item => {
                const asset = item.marginCoin ?? item.coin ?? this.marginCoin;
                const balance = item.equity ?? item.available ?? '0';
                const frozen = toNumber(item.frozen ?? item.locked);
                return {
                    asset,
                    balance,
                    crossWalletBalance: (toNumber(item.available) + frozen).toString(),
                    balanceChange: '0'
                };
            });
            return balances.length > 0
                ? { event: 'ACCOUNT_UPDATE', accountData: { balances, positions: undefined }, orderData: undefined, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' }
                : undefined;
        }
        if (isRecord(message) && message.event === 'error') {
            return { event: 'listenKeyExpired', accountData: undefined, orderData: undefined };
        }
        return undefined;
    };
    normalizeInterval(interval) {
        const map = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1H',
            '4h': '4H',
            '1d': '1D',
            '1w': '1W'
        };
        return map[interval] ?? interval;
    }
}
