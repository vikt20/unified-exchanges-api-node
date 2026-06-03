import BitgetBase from './BitgetBase.js';
import type { IStreamManager } from '../core/IStreamManager.js';
import type { IBinanceWebsocketApiClient } from '../binance/BinanceWebsocketApi.js';
import type { BookTickerData, DepthData, FundingData, HandleWebSocket, KlineData, SocketStatus, TradeData, UserData } from '../core/types.js';
import { BitgetInstType, BitgetWsArg, BitgetWsEvent } from './converters.js';
type BitgetParser<T> = (message: BitgetWsEvent) => T | T[] | undefined;
export default class BitgetStreams extends BitgetBase implements IStreamManager {
    protected subscriptions: {
        id: string;
        disconnect: () => void;
    }[];
    getTradingWsApiClient(): () => IBinanceWebsocketApiClient | undefined;
    closeAllSockets(): void;
    closeById(id: string): void;
    protected handleWebSocket<T>(url: string, args: BitgetWsArg[], parser: BitgetParser<T>, callback: (data: T) => void, title: string, statusCallback?: (status: SocketStatus) => void, auth?: boolean): Promise<HandleWebSocket>;
    private firstData;
    private getSymbol;
    private parseDepth;
    private parseKline;
    private parseTicker;
    private parseBookTicker;
    private parseFunding;
    private parseTrade;
    protected publicArgs(instType: BitgetInstType, channel: string, symbols: string[]): BitgetWsArg[];
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    fundingStream(symbols: string[], callback: (data: FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    private parseUserData;
    private normalizeInterval;
}
export {};
//# sourceMappingURL=BitgetStreams.d.ts.map