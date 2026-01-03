// import BinanceBase, { AccountData,  } from "./BinanceBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import BinanceBase, { AccountData, OrderData, OrderType, TimeInForce, OrderStatus, OrderWorkingType, PositionDirection, Type } from "./BinanceBase.js";
import { convertTradeDataWebSocket, convertDepthData, convertKlineData, convertUserData, convertBookTickerData } from "./converters.js";
import ws from 'ws';


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
        b: [string, string]; // Array of bids
        a: [string, string]; // Array of asks
    };
};

export type UserData = {
    event: "ACCOUNT_UPDATE" | "ORDER_TRADE_UPDATE" | "ALGO_UPDATE" | "listenKeyExpired",
    accountData: AccountData | undefined
    orderData: OrderData | undefined
}
export type DepthData = {
    symbol: string,
    asks: [string, string],
    bids: [string, string]
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
        "e": "aggTrade",  // Event type
        "E": 123456789,   // Event time
        "s": "BTCUSDT",    // Symbol
        "a": 5933014,		// Aggregate trade ID
        "p": "0.001",     // Price
        "q": "100",       // Quantity
        "f": 100,         // First trade ID
        "l": 105,         // Last trade ID
        "T": 123456785,   // Trade time
        "m": true,        // Is the buyer the market maker?
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
    // webSocket: ws,
    disconnect: Function,
    id: string
}

export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG'


export default class BinanceStreams extends BinanceBase implements IStreamManager {
    constructor(apiKey?: string, apiSecret?: string, pingServer: boolean = false) {
        super(apiKey, apiSecret, pingServer)
    }

    protected subscriptions: { id: string, disconnect: Function }[] = [];
    protected listenKeyInterval: NodeJS.Timeout | undefined

    closeAllSockets() {
        // Disconnect all sockets
        this.subscriptions.forEach(sub => sub.disconnect());

        // Clear the subscriptions array
        this.subscriptions = [];

        clearInterval(this.listenKeyInterval);
        this.destroy();
    }

    closeById(id: string) {
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
    handleWebSocket(
        createWs: () => ws,
        parser: Function,
        callback: Function,
        title: string,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket> {
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

                    // Retry after delay for subsequent failures
                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                    return;
                }

                currentWs.on('message', (data: any) => {
                    try {
                        callback(parser(JSON.parse(data)));
                    } catch (e) {
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
                    statusCallback?.('OPEN');

                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });

                currentWs.on('close', (code: number, reason: string) => {
                    // Don't reconnect if manually disconnected
                    if (!isActive) {
                        return;
                    }

                    // Reconnect after delay for any close event
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
                    // For subsequent errors, the close event will handle reconnection
                });
            };

            connect();
        });
    }

    // keep listen key alive by ping every 30min
    keepAliveListenKeyByInterval = (type: Type) => {
        clearInterval(this.listenKeyInterval)
        this.listenKeyInterval = setInterval(() => this.keepAliveListenKey(type), 30 * 60 * 1000)
    }

    //subscribe to spot depth stream
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(BinanceBase.SPOT_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertDepthData, callback, 'spotDepthStream()', statusCallback);
    }

    //subscribe to futures depth stream
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@depth@100ms`);
        const createWs = () => new ws(BinanceBase.FUTURES_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertDepthData, callback, 'futuresDepthStream()', statusCallback);
    }

    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(BinanceBase.SPOT_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertKlineData, callback, 'spotCandleStickStream()', statusCallback);
    }

    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${interval}`);
        const createWs = () => new ws(BinanceBase.FUTURES_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertKlineData, callback, 'futuresCanldeStickStream()', statusCallback);
    }

    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(BinanceBase.FUTURES_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'futuresBookTicketStream()', statusCallback);
    }

    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);
        const createWs = () => new ws(BinanceBase.SPOT_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertBookTickerData, callback, 'spotBookTicketStream()', statusCallback);
    }

    async futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(BinanceBase.FUTURES_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'futuresTradeStream()', statusCallback);
    }

    async spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const streams = symbols.map(symbol => `${symbol.toLowerCase()}@aggTrade`);
        const createWs = () => new ws(BinanceBase.SPOT_STREAM_URL_COMBINED + streams.join('/'));

        return this.handleWebSocket(createWs, convertTradeDataWebSocket, callback, 'spotTradeStream()', statusCallback);
    }

    async futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const listenKey = await this.getFuturesListenKey();
        if (!listenKey.success || !listenKey.data) {
            console.log('Error getting listen key: ', listenKey.errors);
            return Promise.reject()
        }

        // send ping every 30min to keep listenKey alive
        this.keepAliveListenKeyByInterval('futures')

        const createWs = () => new ws(BinanceBase.FUTURES_STREAM_URL + listenKey.data!.listenKey);

        return this.handleWebSocket(createWs, convertUserData, callback, 'futuresUserDataStream()', statusCallback);
    }



}



