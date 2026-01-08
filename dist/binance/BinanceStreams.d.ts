import { IStreamManager } from "../core/IStreamManager.js";
import BinanceBase, { AccountData, OrderData, OrderType, TimeInForce, OrderStatus, OrderWorkingType, PositionDirection, Type } from "./BinanceBase.js";
import ws from 'ws';
export type UserDataWebSocket = {
    e: UserData['event'];
    o?: OrderDataWebSocket | AlgoOrderDataWebSocket;
    a?: AccountDataWebSocket;
};
export type AccountDataWebSocket = {
    B: Array<{
        a: string;
        wb: string;
        cw: string;
        bc: string;
    }>;
    P: Array<{
        s: string;
        pa: string;
        ep: string;
        cr: string;
        up: string;
        mt: string;
        iw: string;
        ps: string;
    }>;
};
export type OrderDataWebSocket = {
    s: string;
    c: string;
    S: "BUY" | "SELL";
    o: OrderType;
    f: TimeInForce;
    q: string;
    p: string;
    ap: string;
    sp: string;
    x: OrderStatus;
    X: OrderStatus;
    i: number;
    l: string;
    z: string;
    L: string;
    n: string;
    N: string;
    T: number;
    t: number;
    b: string;
    a: string;
    m: boolean;
    R: boolean;
    wt: OrderWorkingType;
    ot: OrderType;
    ps: PositionDirection;
    cp: boolean;
    rp: string;
    pP: boolean;
    si: number;
    ss: number;
    V: string;
    pm: string;
    gtd: number;
    AP: string;
    cr: string;
};
export type AlgoOrderDataWebSocket = {
    caid: string;
    aid: number;
    at: string;
    o: string;
    s: string;
    S: string;
    ps: string;
    f: string;
    q: string;
    X: OrderStatus;
    ai: string;
    ap: string;
    aq: string;
    act: string;
    tp: string;
    p: string;
    V: string;
    wt: string;
    pm: string;
    cp: boolean;
    pP: boolean;
    R: boolean;
    tt: number;
    gtd: number;
    rm: string;
};
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
export type UserData = {
    event: "ACCOUNT_UPDATE" | "ORDER_TRADE_UPDATE" | "ALGO_UPDATE" | "listenKeyExpired";
    accountData: AccountData | undefined;
    orderData: OrderData | undefined;
};
export type DepthData = {
    symbol: string;
    asks: Array<[string, string]>;
    bids: Array<[string, string]>;
};
export type KlineData = {
    symbol: string;
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades: number;
};
export type BookTickerData = {
    symbol: string;
    bestBid: number;
    bestBidQty: number;
    bestAsk: number;
    bestAskQty: number;
};
export type TradeDataWebSocket = {
    stream: string;
    data: {
        "e": "aggTrade";
        "E": 123456789;
        "s": "BTCUSDT";
        "a": 5933014;
        "p": "0.001";
        "q": "100";
        "f": 100;
        "l": 105;
        "T": 123456785;
        "m": true;
    };
};
export type TradeData = {
    symbol: string;
    price: number;
    quantity: number;
    tradeTime: number;
    orderType: 'BUY' | 'SELL';
};
export type HandleWebSocket = {
    disconnect: Function;
    id: string;
};
export type SocketStatus = 'OPEN' | 'CLOSE' | 'ERROR' | 'PING' | 'PONG';
export default class BinanceStreams extends BinanceBase implements IStreamManager {
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean, pingServer?: boolean);
    protected subscriptions: {
        id: string;
        disconnect: Function;
    }[];
    protected listenKeyInterval: NodeJS.Timeout | undefined;
    closeAllSockets(): void;
    closeById(id: string): void;
    /**
     * @param createWs - function to create webSocket connection
     * @param parser - convertation function
     * @param callback - function to handle data
     * @param title
     * @returns object with webSocket, id and setIsKeepAlive function
     */
    handleWebSocket(createWs: () => ws, parser: Function, callback: Function, title: string, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    keepAliveListenKeyByInterval: (type: Type) => void;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    fundingStream(symbols: string[], callback: (data: import("../core/types.js").FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
}
//# sourceMappingURL=BinanceStreams.d.ts.map