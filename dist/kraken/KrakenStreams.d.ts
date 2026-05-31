import { IStreamManager } from '../core/IStreamManager.js';
import KrakenBase from './KrakenBase.js';
import { DepthData, KlineData, TradeData, BookTickerData, FundingData, UserData, HandleWebSocket, SocketStatus, IWebsocketApiClient } from '../core/types.js';
export default class KrakenStreams extends KrakenBase implements IStreamManager {
    protected subscriptions: {
        id: string;
        disconnect: () => void;
    }[];
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean);
    closeAllSockets(): void;
    closeById(id: string): void;
    getTradingWsApiClient(): () => IWebsocketApiClient | undefined;
    protected handleWebSocket<T>(url: string, subscribeMessage: object, parser: (message: object) => T | T[] | undefined, callback: (data: T) => void, title: string, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    private parseSpotBook;
    private parseSpotTicker;
    private parseSpotTrade;
    private parseSpotOhlc;
    private parseFuturesBook;
    private parseFuturesTrade;
    private parseFuturesTicker;
    private parseFuturesFunding;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, _levels?: number): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    fundingStream(symbols: string[], callback: (data: FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    private normalizeSpotInterval;
    private normalizeSpotWsSymbol;
    private normalizeSpotAsset;
    private normalizeFuturesIntervalMs;
}
//# sourceMappingURL=KrakenStreams.d.ts.map