import ws from 'ws';
import BitgetBase from './BitgetBase.js';
import type { IStreamManager } from '../core/IStreamManager.js';
import type { IBinanceWebsocketApiClient } from '../binance/BinanceWebsocketApi.js';
import type {
    BookTickerData,
    DepthData,
    FundingData,
    FundingStreamOptions,
    HandleWebSocket,
    KlineData,
    OrderData,
    SocketStatus,
    TradeData,
    UserData
} from '../core/types.js';
import { createFundingIntervalCallback } from '../core/fundingInterval.js';
import {
    BitgetInstType,
    BitgetWsArg,
    BitgetWsEvent,
    convertBookTickerFromDepth,
    convertFunding,
    convertCandle,
    convertOrder,
    convertPosition,
    convertTicker,
    convertWsCandle,
    convertWsDepth,
    convertWsTrade,
    isBitgetOrder,
    isBitgetWsAccount,
    isBitgetWsCandle,
    isBitgetWsDepth,
    isBitgetWsEvent,
    isBitgetWsPosition,
    isBitgetWsTicker,
    isBitgetWsTrade,
    isRecord,
    isBitgetCandle,
    toNumber
} from './converters.js';

type BitgetParser<T> = (message: BitgetWsEvent) => T | T[] | undefined;

interface BitgetSubscribeMessage {
    op: 'subscribe';
    args: BitgetWsArg[];
}

interface BitgetLoginMessage {
    op: 'login';
    args: Array<{
        apiKey: string;
        passphrase: string;
        timestamp: string;
        sign: string;
    }>;
}

export default class BitgetStreams extends BitgetBase implements IStreamManager {
    protected subscriptions: { id: string; disconnect: () => void }[] = [];

    public getTradingWsApiClient(): () => IBinanceWebsocketApiClient | undefined {
        return () => undefined;
    }

    closeAllSockets(): void {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
    }

    closeById(id: string): void {
        const index = this.subscriptions.findIndex(sub => sub.id === id);
        if (index >= 0) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }

    protected handleWebSocket<T>(
        url: string,
        args: BitgetWsArg[],
        parser: BitgetParser<T>,
        callback: (data: T) => void,
        title: string,
        statusCallback?: (status: SocketStatus) => void,
        auth: boolean = false
    ): Promise<HandleWebSocket> {
        title = `${this.exchange_id}:${title}`;
        const id = `bitget-${Math.random().toString(36).slice(2)}`;
        const reconnectDelay = 3000;
        const pingIntervalMs = 20000;
        let isActive = true;
        let currentWs: ws | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let pingTimer: NodeJS.Timeout | null = null;

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
                if (args.length === 0) return;
                const message: BitgetSubscribeMessage = { op: 'subscribe', args };
                currentWs?.send(JSON.stringify(message));
            };

            const connect = () => {
                if (!isActive) return;
                cleanup();

                try {
                    currentWs = new ws(url);
                } catch (error) {
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
                        const login: BitgetLoginMessage = {
                            op: 'login',
                            args: [{
                                apiKey: this.apiKey,
                                passphrase: this.apiPassphrase,
                                timestamp,
                                sign
                            }]
                        };
                        currentWs?.send(JSON.stringify(login));
                    } else {
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

                currentWs.on('message', (data: ws.RawData) => {
                    const text = data.toString();
                    if (text === 'pong') {
                        statusCallback?.('PONG');
                        return;
                    }

                    try {
                        const parsed: unknown = JSON.parse(text);
                        if (!isBitgetWsEvent(parsed)) return;

                        if (parsed.event === 'login') {
                            if (parsed.code === '0') subscribe();
                            else statusCallback?.('AUTH_FAILED');
                            return;
                        }
                        if (parsed.event === 'subscribe') return;
                        if (parsed.event === 'error') {
                            statusCallback?.('ERROR');
                            return;
                        }

                        const result = parser(parsed);
                        if (Array.isArray(result)) {
                            result.forEach(callback);
                        } else if (result) {
                            callback(result);
                        }
                    } catch {
                        return;
                    }
                });

                currentWs.on('close', () => {
                    statusCallback?.('CLOSE');
                    if (isActive) reconnectTimer = setTimeout(connect, reconnectDelay);
                });

                currentWs.on('error', () => {
                    statusCallback?.('ERROR');
                });
            };

            connect();
        });
    }

    private firstData<T>(message: BitgetWsEvent, guard: (value: unknown) => value is T): T | undefined {
        if (!Array.isArray(message.data)) return undefined;
        return message.data.find(guard);
    }

    private getSymbol(message: BitgetWsEvent): string {
        return message.arg?.instId ?? '';
    }

    private parseDepth = (message: BitgetWsEvent): DepthData | undefined => {
        const data = this.firstData(message, isBitgetWsDepth);
        if (!data) return undefined;
        return convertWsDepth(this.getSymbol(message), data);
    };

    private parseKline = (message: BitgetWsEvent): KlineData | undefined => {
        if (Array.isArray(message.data)) {
            const candle = message.data.find(isBitgetCandle);
            if (candle) return convertCandle(candle, this.getSymbol(message));
        }
        const data = this.firstData(message, isBitgetWsCandle);
        if (!data) return undefined;
        return convertWsCandle(data, this.getSymbol(message));
    };

    private parseTicker = (message: BitgetWsEvent): BookTickerData | undefined => {
        const data = this.firstData(message, isBitgetWsTicker);
        if (!data) return undefined;
        return convertTicker(data, this.getSymbol(message));
    };

    private parseBookTicker = (message: BitgetWsEvent): BookTickerData | undefined => {
        const data = this.firstData(message, isBitgetWsDepth);
        if (!data) return undefined;
        return convertBookTickerFromDepth(data, this.getSymbol(message));
    };

    private parseFunding = (message: BitgetWsEvent): FundingData | undefined => {
        const data = this.firstData(message, isBitgetWsTicker);
        if (!data) return undefined;
        return convertFunding(data, this.getSymbol(message));
    };

    private parseTrade = (message: BitgetWsEvent): TradeData[] | undefined => {
        if (!Array.isArray(message.data)) return undefined;
        return message.data
            .filter(isBitgetWsTrade)
            .map(trade => convertWsTrade(trade, this.getSymbol(message)));
    };

    protected publicArgs(instType: BitgetInstType, channel: string, symbols: string[]): BitgetWsArg[] {
        return symbols.map(symbol => ({ instType, channel, instId: symbol }));
    }

    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels: number = 51): Promise<HandleWebSocket> {
        const channel = levels <= 5 ? 'books5' : levels <= 50 ? 'books50' : 'books';
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', channel, symbols), this.parseDepth, callback, 'spotDepthStream', statusCallback);
    }

    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels: number = 51): Promise<HandleWebSocket> {
        const channel = levels <= 5 ? 'books5' : levels <= 50 ? 'books50' : 'books';
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, channel, symbols), this.parseDepth, callback, 'futuresDepthStream', statusCallback);
    }

    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', `candle${this.normalizeInterval(interval)}`, symbols), this.parseKline, callback, 'spotCandleStickStream', statusCallback);
    }

    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, `candle${this.normalizeInterval(interval)}`, symbols), this.parseKline, callback, 'futuresCandleStickStream', statusCallback);
    }

    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', 'books1', symbols), this.parseBookTicker, callback, 'spotBookTickerStream', statusCallback);
    }

    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'books1', symbols), this.parseBookTicker, callback, 'futuresBookTickerStream', statusCallback);
    }

    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs('SPOT', 'trade', symbols), this.parseTrade, callback, 'spotTradeStream', statusCallback);
    }

    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        return this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'trade', symbols), this.parseTrade, callback, 'futuresTradeStream', statusCallback);
    }

    private async fetchFundingInterval(symbol: string): Promise<number | undefined> {
        const response = await this.publicRequest<Array<{ ratePeriod?: string }>>(
            this.productType,
            'GET',
            '/api/v2/mix/market/funding-time',
            { symbol, productType: this.productType }
        );
        const interval = Number(response.data?.[0]?.ratePeriod);
        return Number.isFinite(interval) && interval > 0 ? interval : undefined;
    }

    async fundingStream(
        symbols: string[],
        callback: (data: FundingData) => void,
        statusCallback?: (status: SocketStatus) => void,
        options?: FundingStreamOptions
    ): Promise<HandleWebSocket> {
        let isActive = true;
        const fundingCallback = createFundingIntervalCallback(
            callback,
            options?.fetchInterval === true,
            symbol => this.fetchFundingInterval(symbol),
            () => isActive
        );
        const handle = await this.handleWebSocket(this.getStreamUrl('public'), this.publicArgs(this.productType, 'ticker', symbols), this.parseFunding, fundingCallback, 'fundingStream', statusCallback);
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

    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
            statusCallback?.('AUTH_FAILED');
            return Promise.reject(new Error('Bitget futures user data requires apiKey, apiSecret, and apiPassphrase'));
        }

        const args: BitgetWsArg[] = [
            { instType: this.productType, channel: 'orders' },
            { instType: this.productType, channel: 'positions' },
            { instType: this.productType, channel: 'account' }
        ];

        return this.handleWebSocket(
            this.getStreamUrl('private'),
            args,
            this.parseUserData,
            callback,
            'futuresUserDataStream',
            statusCallback,
            true
        );
    }

    private parseUserData = (message: BitgetWsEvent): UserData | undefined => {
        const channel = message.arg?.channel;
        if (!Array.isArray(message.data)) return undefined;

        if (channel === 'orders') {
            const orderData: OrderData[] = message.data.filter(isBitgetOrder).map(convertOrder);
            return orderData.length > 0
                ? { event: 'ORDER_TRADE_UPDATE', accountData: undefined, orderData, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' }
                : undefined;
        }

        if (channel === 'positions') {
            const positions = message.data.filter(isBitgetWsPosition).map(convertPosition);
            return positions.length > 0
                ? { event: 'ACCOUNT_UPDATE', accountData: { balances: undefined, positions }, orderData: undefined, updateType: message.action === 'snapshot' ? 'SNAPSHOT' : 'DELTA' }
                : undefined;
        }

        if (channel === 'account') {
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

    private normalizeInterval(interval: string): string {
        const map: Record<string, string> = {
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
