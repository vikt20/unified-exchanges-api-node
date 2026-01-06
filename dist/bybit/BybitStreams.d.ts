import BybitBase from "./BybitBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import { DepthData, KlineData, TradeData, BookTickerData, UserData, SocketStatus, HandleWebSocket } from "../binance/BinanceStreams.js";
export default class BybitStreams extends BybitBase implements IStreamManager {
    protected subscriptions: {
        id: string;
        disconnect: Function;
    }[];
    constructor(apiKey?: string, apiSecret?: string);
    protected handleWebSocket(url: string, topics: string[], callback: Function, parser: Function, title: string, statusCallback?: (status: SocketStatus) => void, auth?: boolean): Promise<HandleWebSocket>;
    private generateHmacSignature;
    closeAllSockets(): void;
    closeById(id: string): void;
    private parseDepth;
    private parseKline;
    private parseBookTicker;
    private parseTrade;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
}
//# sourceMappingURL=BybitStreams.d.ts.map