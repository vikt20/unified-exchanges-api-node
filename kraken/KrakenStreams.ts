import ws from 'ws';
import { IStreamManager } from '../core/IStreamManager.js';
import KrakenBase from './KrakenBase.js';
import {
    DepthData,
    KlineData,
    TradeData,
    BookTickerData,
    FundingData,
    UserData,
    HandleWebSocket,
    SocketStatus,
    IWebsocketApiClient,
    PositionData
} from '../core/types.js';
import {
    KrakenSpotBookMessage,
    KrakenSpotTickerMessage,
    KrakenSpotTradeMessage,
    KrakenSpotOhlcMessage,
    KrakenFuturesBookSnapshotMessage,
    KrakenFuturesBookDeltaMessage,
    KrakenFuturesTradeSnapshotMessage,
    KrakenFuturesTradeMessage,
    KrakenFuturesTickerMessage,
    KrakenFuturesOpenOrdersSnapshotMessage,
    KrakenFuturesOpenOrdersDeltaMessage,
    KrakenFuturesOpenPositionsMessage,
    KrakenFuturesBalancesMessage,
    KrakenFuturesWsOpenOrder,
    toBookTickerFromTicker,
    toFundingFromTicker,
    toSpotBookTickerFromTicker,
    convertKrakenFuturesWsOrder,
    convertKrakenFuturesWsPosition,
    convertKrakenFuturesWsBalances
} from './converters.js';
import crypto from 'crypto';

export default class KrakenStreams extends KrakenBase implements IStreamManager {
    protected subscriptions: { id: string; disconnect: () => void }[] = [];

    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

    closeAllSockets(): void {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
    }

    closeById(id: string): void {
        const index = this.subscriptions.findIndex(s => s.id === id);
        if (index >= 0) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }

    public getTradingWsApiClient(): () => IWebsocketApiClient | undefined {
        return () => undefined; // BybitStreams does not use BinanceWebsocketApiClient, so we return undefined
    }

    protected handleWebSocket<T>(
        url: string,
        subscribeMessage: object,
        parser: (message: object) => T | T[] | undefined,
        callback: (data: T) => void,
        title: string,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket> {
        title = `${this.exchange_id}:${title}`;
        const id = Math.random().toString(36).slice(2);
        let isActive = true;
        let currentWs: ws | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        const reconnectDelay = 3000;

        const cleanup = () => {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
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

            const connect = () => {
                if (!isActive) return;
                cleanup();

                try {
                    currentWs = new ws(url);
                } catch (e) {
                    if (firstConnection) {
                        firstConnection = false;
                        reject(e);
                    }
                    reconnectTimer = setTimeout(connect, reconnectDelay);
                    return;
                }

                currentWs.on('open', () => {
                    statusCallback?.('OPEN');
                    currentWs?.send(JSON.stringify(subscribeMessage));
                    if (firstConnection) {
                        firstConnection = false;
                        resolve({ disconnect, id });
                    }
                });

                currentWs.on('message', (data: ws.RawData) => {
                    try {
                        const text = data.toString();
                        const message = JSON.parse(text) as object;
                        const parsed = parser(message);
                        if (Array.isArray(parsed)) {
                            for (const item of parsed) callback(item);
                        } else if (parsed) {
                            callback(parsed);
                        }
                    } catch (e) {
                        // ignore malformed frames
                    }
                });

                currentWs.on('close', () => {
                    statusCallback?.('CLOSE');
                    if (!isActive) return;
                    reconnectTimer = setTimeout(connect, reconnectDelay);
                });

                currentWs.on('error', () => {
                    statusCallback?.('ERROR');
                });

                currentWs.on('ping', () => {
                    statusCallback?.('PING');
                    currentWs?.pong();
                });

                currentWs.on('pong', () => {
                    statusCallback?.('PONG');
                });
            };

            connect();
        });
    }

    private parseSpotBook(message: object): DepthData | undefined {
        const msg = message as KrakenSpotBookMessage;
        if (msg.channel !== 'book' || !msg.data || msg.data.length === 0) return undefined;
        const data = msg.data[0];
        return {
            symbol: data.symbol,
            asks: (data.asks ?? []).map(a => [a.price.toString(), a.qty.toString()]),
            bids: (data.bids ?? []).map(b => [b.price.toString(), b.qty.toString()])
        };
    }

    private parseSpotTicker(message: object): BookTickerData | undefined {
        const msg = message as KrakenSpotTickerMessage;
        if (msg.channel !== 'ticker' || !msg.data || msg.data.length === 0) return undefined;
        return toSpotBookTickerFromTicker(msg.data[0]);
    }

    private parseSpotTrade(message: object): TradeData[] | undefined {
        const msg = message as KrakenSpotTradeMessage;
        if (msg.channel !== 'trade' || !msg.data || msg.data.length === 0) return undefined;
        return msg.data.map(t => ({
            symbol: t.symbol,
            price: t.price,
            quantity: t.qty,
            tradeTime: Date.parse(t.timestamp),
            orderType: t.side === 'buy' ? 'BUY' : 'SELL'
        }));
    }

    private parseSpotOhlc(message: object): KlineData[] | undefined {
        const msg = message as KrakenSpotOhlcMessage;
        if (msg.channel !== 'ohlc' || !msg.data || msg.data.length === 0) return undefined;
        return msg.data.map(c => ({
            symbol: c.symbol,
            time: c.interval_begin * 1000,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            trades: c.trades
        }));
    }

    private parseFuturesBook(message: object): DepthData | undefined {
        const snapshot = message as KrakenFuturesBookSnapshotMessage;
        if (snapshot.feed === 'book_snapshot') {
            if (!snapshot.product_id) return undefined;
            const toTuple = (level: import('./converters.js').KrakenFuturesOrderBookLevel): [string, string] | null => {
                if (Array.isArray(level) && level.length >= 2) {
                    return [level[0].toString(), level[1].toString()];
                }
                if (!Array.isArray(level) && typeof level.price === 'number' && typeof level.qty === 'number') {
                    return [level.price.toString(), level.qty.toString()];
                }
                return null;
            };
            const asks = snapshot.asks.map(toTuple).filter((v): v is [string, string] => v !== null);
            const bids = snapshot.bids.map(toTuple).filter((v): v is [string, string] => v !== null);
            return {
                symbol: snapshot.product_id,
                asks,
                bids
            };
        }
        const delta = message as KrakenFuturesBookDeltaMessage;
        if (delta.feed === 'book') {
            if (!delta.product_id) return undefined;
            const bids: [string, string][] = delta.side === 'buy' ? [[delta.price.toString(), delta.qty.toString()]] : [];
            const asks: [string, string][] = delta.side === 'sell' ? [[delta.price.toString(), delta.qty.toString()]] : [];
            return {
                symbol: delta.product_id,
                asks,
                bids
            };
        }
        return undefined;
    }

    private parseFuturesTrade(message: object): TradeData[] | undefined {
        const snapshot = message as KrakenFuturesTradeSnapshotMessage;
        if (snapshot.feed === 'trade_snapshot') {
            if (!snapshot.product_id) return undefined;
            return snapshot.trades.map(t => ({
                symbol: t.product_id,
                price: t.price,
                quantity: t.qty,
                tradeTime: t.time,
                orderType: t.side === 'buy' ? 'BUY' : 'SELL'
            }));
        }
        const trade = message as KrakenFuturesTradeMessage;
        if (trade.feed === 'trade') {
            if (!trade.product_id) return undefined;
            return [{
                symbol: trade.product_id,
                price: trade.price,
                quantity: trade.qty,
                tradeTime: trade.time,
                orderType: trade.side === 'buy' ? 'BUY' : 'SELL'
            }];
        }
        return undefined;
    }

    private parseFuturesTicker(message: object): BookTickerData | undefined {
        const ticker = message as KrakenFuturesTickerMessage;
        if (!ticker.feed || !ticker.product_id) return undefined;
        return toBookTickerFromTicker(ticker);
    }

    private parseFuturesFunding(message: object): FundingData | undefined {
        const ticker = message as KrakenFuturesTickerMessage;
        if (!ticker.feed || !ticker.product_id) return undefined;
        return toFundingFromTicker(ticker);
    }

    // --- Spot Streams ---

    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels: number = 10): Promise<HandleWebSocket> {
        const wsSymbols = symbols.map(s => this.normalizeSpotWsSymbol(s));
        const message = {
            method: 'subscribe',
            params: {
                channel: 'book',
                symbol: wsSymbols,
                depth: levels,
                snapshot: true
            }
        };
        return this.handleWebSocket(this.getStreamUrl('spot'), message, this.parseSpotBook.bind(this), callback, 'spotDepthStream', statusCallback);
    }

    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const wsSymbols = symbols.map(s => this.normalizeSpotWsSymbol(s));
        const message = {
            method: 'subscribe',
            params: {
                channel: 'ohlc',
                symbol: wsSymbols,
                interval: this.normalizeSpotInterval(interval),
                snapshot: true
            }
        };
        return this.handleWebSocket(this.getStreamUrl('spot'), message, this.parseSpotOhlc.bind(this), callback, 'spotCandleStickStream', statusCallback);
    }

    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const wsSymbols = symbols.map(s => this.normalizeSpotWsSymbol(s));
        const message = {
            method: 'subscribe',
            params: {
                channel: 'ticker',
                symbol: wsSymbols,
                snapshot: true
            }
        };
        return this.handleWebSocket(this.getStreamUrl('spot'), message, this.parseSpotTicker.bind(this), callback, 'spotBookTickerStream', statusCallback);
    }

    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const wsSymbols = symbols.map(s => this.normalizeSpotWsSymbol(s));
        const message = {
            method: 'subscribe',
            params: {
                channel: 'trade',
                symbol: wsSymbols,
                snapshot: true
            }
        };
        return this.handleWebSocket(this.getStreamUrl('spot'), message, this.parseSpotTrade.bind(this), callback, 'spotTradeStream', statusCallback);
    }

    // --- Futures Streams ---

    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, _levels?: number): Promise<HandleWebSocket> {
        const message = {
            event: 'subscribe',
            feed: 'book',
            product_ids: symbols
        };
        return this.handleWebSocket(this.getStreamUrl('futures'), message, this.parseFuturesBook.bind(this), callback, 'futuresDepthStream', statusCallback);
    }

    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const intervalMs = this.normalizeFuturesIntervalMs(interval);
        const candles = new Map<string, KlineData>();
        const currentKeys = new Map<string, string>();
        const message = {
            event: 'subscribe',
            feed: 'trade',
            product_ids: symbols
        };
        const parseCandle = (rawMessage: object): KlineData[] | undefined => {
            const tradeMessage = rawMessage as KrakenFuturesTradeMessage;
            if (tradeMessage.feed !== 'trade' || !tradeMessage.product_id) return undefined;

            const candleTime = Math.floor(tradeMessage.time / intervalMs) * intervalMs;
            const key = `${tradeMessage.product_id}:${candleTime}`;
            const previousKey = currentKeys.get(tradeMessage.product_id);
            if (previousKey && previousKey !== key) candles.delete(previousKey);
            currentKeys.set(tradeMessage.product_id, key);
            const existing = candles.get(key);
            const candle = existing
                ? {
                    ...existing,
                    high: Math.max(existing.high, tradeMessage.price),
                    low: Math.min(existing.low, tradeMessage.price),
                    close: tradeMessage.price,
                    volume: existing.volume + tradeMessage.qty,
                    trades: existing.trades + 1
                }
                : {
                    symbol: tradeMessage.product_id,
                    time: candleTime,
                    open: tradeMessage.price,
                    high: tradeMessage.price,
                    low: tradeMessage.price,
                    close: tradeMessage.price,
                    volume: tradeMessage.qty,
                    trades: 1
                };

            candles.set(key, candle);
            return [candle];
        };

        return this.handleWebSocket(
            this.getStreamUrl('futures'),
            message,
            parseCandle,
            callback,
            'futuresCandleStickStream',
            statusCallback
        );
    }

    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const message = {
            event: 'subscribe',
            feed: 'ticker',
            product_ids: symbols
        };
        return this.handleWebSocket(this.getStreamUrl('futures'), message, this.parseFuturesTicker.bind(this), callback, 'futuresBookTickerStream', statusCallback);
    }

    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const message = {
            event: 'subscribe',
            feed: 'trade',
            product_ids: symbols
        };
        return this.handleWebSocket(this.getStreamUrl('futures'), message, this.parseFuturesTrade.bind(this), callback, 'futuresTradeStream', statusCallback);
    }

    fundingStream(symbols: string[], callback: (data: FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const message = {
            event: 'subscribe',
            feed: 'ticker',
            product_ids: symbols
        };
        return this.handleWebSocket(this.getStreamUrl('futures'), message, this.parseFuturesFunding.bind(this), callback, 'fundingStream', statusCallback);
    }

    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        if (!this.apiKey || !this.apiSecret) {
            statusCallback?.('AUTH_FAILED');
            return Promise.reject(new Error('Kraken Futures user data requires API key and secret'));
        }

        type KrakenFuturesUserWsMessage = {
            event?: string;
            message?: string;
            feed?: string;
            account?: string;
            positions?: KrakenFuturesOpenPositionsMessage['positions'];
            holding?: KrakenFuturesBalancesMessage['holding'];
            futures?: KrakenFuturesBalancesMessage['futures'];
            flex_futures?: KrakenFuturesBalancesMessage['flex_futures'];
            orders?: KrakenFuturesOpenOrdersSnapshotMessage['orders'];
            order?: KrakenFuturesOpenOrdersDeltaMessage['order'];
            order_id?: KrakenFuturesOpenOrdersDeltaMessage['order_id'];
            is_cancel?: KrakenFuturesOpenOrdersDeltaMessage['is_cancel'];
            reason?: KrakenFuturesOpenOrdersDeltaMessage['reason'];
        };

        const id = `kraken-futures-userdata-${Math.random().toString(36).slice(2)}`;
        let isActive = true;
        let wsClient: ws | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let heartbeatTimer: NodeJS.Timeout | null = null;
        const reconnectDelay = 3000;
        const heartbeatTimeout = 90000;
        const positionCache = new Map<string, PositionData>();
        const orderCache = new Map<string, KrakenFuturesWsOpenOrder>();

        const createClosedPositionUpdate = (position: PositionData): PositionData => ({
            ...position,
            positionAmount: 0,
            isInPosition: false,
            unrealizedPnL: 0
        });

        const disconnect = () => {
            isActive = false;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (heartbeatTimer) {
                clearTimeout(heartbeatTimer);
                heartbeatTimer = null;
            }
            if (wsClient) {
                wsClient.removeAllListeners();
                wsClient.terminate();
                wsClient = null;
            }
        };

        const signChallenge = (challenge: string): string => {
            const hash = crypto.createHash('sha256').update(challenge).digest();
            const secret = Buffer.from(this.apiSecret, 'base64');
            return crypto.createHmac('sha512', secret).update(hash).digest('base64');
        };

        return new Promise((resolve, reject) => {
            let firstConnection = true;

            const resetHeartbeatTimer = () => {
                if (heartbeatTimer) clearTimeout(heartbeatTimer);
                heartbeatTimer = setTimeout(() => {
                    if (!isActive) return;
                    statusCallback?.('ERROR');
                    wsClient?.terminate();
                }, heartbeatTimeout);
            };

            const scheduleReconnect = () => {
                if (!isActive || reconnectTimer) return;
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    connect();
                }, reconnectDelay);
            };

            const cleanupSocket = () => {
                if (heartbeatTimer) {
                    clearTimeout(heartbeatTimer);
                    heartbeatTimer = null;
                }
                if (wsClient) {
                    wsClient.removeAllListeners();
                    wsClient.terminate();
                    wsClient = null;
                }
            };

            const connect = () => {
                if (!isActive) return;
                cleanupSocket();

                try {
                    wsClient = new ws(this.getStreamUrl('futures'));
                } catch (e) {
                    if (firstConnection) {
                        firstConnection = false;
                        reject(e);
                    }
                    scheduleReconnect();
                    return;
                }

                wsClient.on('open', () => {
                    statusCallback?.('OPEN');
                    resetHeartbeatTimer();
                    const challengeRequest = {
                        event: 'challenge',
                        api_key: this.apiKey
                    };
                    const subscribeHeartbeat = {
                        event: 'subscribe',
                        feed: 'heartbeat'
                    };
                    wsClient?.send(JSON.stringify(challengeRequest));
                    wsClient?.send(JSON.stringify(subscribeHeartbeat));
                    if (firstConnection) {
                        firstConnection = false;
                        resolve({ id, disconnect });
                    }
                });

                wsClient.on('message', (data: ws.RawData) => {
                    resetHeartbeatTimer();
                    try {
                        const messageText = data.toString();
                        const message = JSON.parse(messageText) as KrakenFuturesUserWsMessage;

                        if (message.event === 'challenge' && typeof message.message === 'string') {
                            const originalChallenge = message.message as string;
                            const signedChallenge = signChallenge(originalChallenge);

                            const subscribeOpenOrders = {
                                event: 'subscribe',
                                feed: 'open_orders',
                                api_key: this.apiKey,
                                original_challenge: originalChallenge,
                                signed_challenge: signedChallenge
                            };
                            const subscribeOpenPositions = {
                                event: 'subscribe',
                                feed: 'open_positions',
                                api_key: this.apiKey,
                                original_challenge: originalChallenge,
                                signed_challenge: signedChallenge
                            };
                            const subscribeBalances = {
                                event: 'subscribe',
                                feed: 'balances',
                                api_key: this.apiKey,
                                original_challenge: originalChallenge,
                                signed_challenge: signedChallenge
                            };
                            wsClient?.send(JSON.stringify(subscribeOpenOrders));
                            wsClient?.send(JSON.stringify(subscribeOpenPositions));
                            wsClient?.send(JSON.stringify(subscribeBalances));
                            return;
                        }

                        if (message.event === 'subscribed' || message.event === 'unsubscribed') {
                            return;
                        }

                        if (message.event === 'error') {
                            statusCallback?.('ERROR');
                            return;
                        }

                        const feed = message.feed;
                        if (feed === 'heartbeat') {
                            statusCallback?.('PONG');
                            return;
                        }

                        if (feed === 'balances' || feed === 'balances_snapshot') {
                            const balances = convertKrakenFuturesWsBalances(message as KrakenFuturesBalancesMessage);
                            if (balances.length > 0) {
                                callback({
                                    event: 'ACCOUNT_UPDATE',
                                    accountData: { balances, positions: undefined },
                                    orderData: undefined,
                                    updateType: feed === 'balances_snapshot' ? 'SNAPSHOT' : 'DELTA'
                                });
                            }
                            return;
                        }

                        if (feed === 'open_positions') {
                            const positions = Array.isArray(message.positions)
                                ? message.positions.map(convertKrakenFuturesWsPosition)
                                : [];
                            const currentSymbols = new Set(positions.map(position => position.symbol));
                            const closedPositions = Array.from(positionCache.entries())
                                .filter(([symbol]) => !currentSymbols.has(symbol))
                                .map(([, position]) => createClosedPositionUpdate(position));

                            positionCache.clear();
                            for (const position of positions) {
                                if (position.isInPosition && position.positionAmount !== 0) {
                                    positionCache.set(position.symbol, position);
                                }
                            }

                            callback({
                                event: 'ACCOUNT_UPDATE',
                                accountData: { balances: undefined, positions: [...positions, ...closedPositions] },
                                orderData: undefined,
                                updateType: 'SNAPSHOT'
                            });
                            return;
                        }

                        if (feed === 'open_orders_snapshot' || feed === 'open_orders_verbose_snapshot') {
                            const incomingOrderIds = new Set((message.orders ?? []).map(order => order.order_id));
                            const removedOrders = Array.from(orderCache.entries())
                                .filter(([orderId]) => !incomingOrderIds.has(orderId))
                                .map(([, order]) => convertKrakenFuturesWsOrder(order, true));

                            orderCache.clear();
                            const orders = (message.orders ?? []).map(order => {
                                orderCache.set(order.order_id, order);
                                return convertKrakenFuturesWsOrder(order);
                            });
                            callback({
                                event: 'ORDER_TRADE_UPDATE',
                                accountData: undefined,
                                orderData: [...orders, ...removedOrders],
                                updateType: 'SNAPSHOT'
                            });
                            return;
                        }

                        if (feed === 'open_orders') {
                            const isCancel = message.is_cancel === true;
                            if (message.order) {
                                if (isCancel) {
                                    orderCache.delete(message.order.order_id);
                                } else {
                                    orderCache.set(message.order.order_id, message.order);
                                }
                                const orderData = convertKrakenFuturesWsOrder(message.order, isCancel, message.reason);
                                callback({
                                    event: 'ORDER_TRADE_UPDATE',
                                    accountData: undefined,
                                    orderData: [orderData],
                                    updateType: 'DELTA'
                                });
                            } else if (message.order_id && isCancel) {
                                const cached = orderCache.get(message.order_id);
                                if (cached) {
                                    orderCache.delete(message.order_id);
                                    const orderData = convertKrakenFuturesWsOrder(cached, true, message.reason);
                                    callback({
                                        event: 'ORDER_TRADE_UPDATE',
                                        accountData: undefined,
                                        orderData: [orderData],
                                        updateType: 'DELTA'
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                });

                wsClient.on('close', () => {
                    statusCallback?.('CLOSE');
                    if (heartbeatTimer) {
                        clearTimeout(heartbeatTimer);
                        heartbeatTimer = null;
                    }
                    scheduleReconnect();
                });

                wsClient.on('error', () => {
                    statusCallback?.('ERROR');
                    wsClient?.terminate();
                });

                wsClient.on('ping', () => {
                    statusCallback?.('PING');
                    wsClient?.pong();
                });

                wsClient.on('pong', () => {
                    statusCallback?.('PONG');
                });
            };

            connect();
        });
    }

    private normalizeSpotInterval(interval: string): number {
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

    private normalizeSpotWsSymbol(symbol: string): string {
        if (symbol.includes('/')) return symbol;
        const knownQuotes = ['USDT', 'USDC', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
        for (const quote of knownQuotes) {
            if (symbol.endsWith(quote)) {
                const baseRaw = symbol.slice(0, -quote.length);
                const base = this.normalizeSpotAsset(baseRaw);
                const quoteAsset = this.normalizeSpotAsset(quote);
                return `${base}/${quoteAsset}`;
            }
        }
        if (symbol.length > 3) {
            const base = this.normalizeSpotAsset(symbol.slice(0, symbol.length - 3));
            const quote = this.normalizeSpotAsset(symbol.slice(-3));
            return `${base}/${quote}`;
        }
        return this.normalizeSpotAsset(symbol);
    }

    private normalizeSpotAsset(asset: string): string {
        let normalized = asset;
        if ((normalized.startsWith('X') || normalized.startsWith('Z')) && normalized.length > 3) {
            normalized = normalized.slice(1);
        }
        if (normalized === 'BTC') return 'XBT';
        if (normalized === 'DOGE') return 'XDG';
        return normalized;
    }

    private normalizeFuturesIntervalMs(interval: string): number {
        const map: Record<string, number> = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000
        };
        return map[interval] ?? map['1m'];
    }
}
