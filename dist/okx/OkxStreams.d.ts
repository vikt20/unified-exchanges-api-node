import OkxBase from "./OkxBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import { SocketStatus, HandleWebSocket, UserData } from "../core/types/streams.js";
import { DepthData, KlineData, TradeData, BookTickerData, IWebsocketApiClient, ExtractedInfo } from "../core/types.js";
export default class OkxStreams extends OkxBase implements IStreamManager {
    protected subscriptions: {
        id: string;
        disconnect: Function;
        title: string;
    }[];
    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest?: boolean, exchangeInfoFutures?: ExtractedInfo[] | false);
    getTradingWsApiClient(): () => IWebsocketApiClient | undefined;
    protected handleWebSocket(url: string, args: any[], callback: Function, parser: Function, title: string, statusCallback?: (status: SocketStatus) => void, auth?: boolean): Promise<HandleWebSocket>;
    closeAllSockets(): void;
    closeById(id: string): void;
    private convertOrderContractsToAssetSize;
    private convertPositionContractsToAssetSize;
    private parseDepth;
    private parseDepthFutures;
    private parseKline;
    private parseBookTicker;
    private parseBookTickerFutures;
    private parseTrade;
    private parseTradeFutures;
    private parseFunding;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    normalizeOkxInterval(interval: string): string;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    fundingStream(symbols: string[], callback: (data: import("../core/types.js").FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
}
//# sourceMappingURL=OkxStreams.d.ts.map