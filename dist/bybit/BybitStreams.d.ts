import BybitBase from "./BybitBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import { SocketStatus, HandleWebSocket, UserData } from "../core/types/streams.js";
import { DepthData, KlineData, TradeData, BookTickerData, IWebsocketApiClient, FundingStreamOptions, WebsocketApiOption, FormattedResponse } from "../core/types.js";
export type TradingWsRequestResult<T> = {
    status: 'success';
    response: FormattedResponse<T>;
} | {
    status: 'unavailable';
    error: string;
};
export default class BybitStreams extends BybitBase implements IStreamManager {
    protected subscriptions: {
        id: string;
        disconnect: Function;
    }[];
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean, useWebsocketApi?: WebsocketApiOption<IWebsocketApiClient>);
    protected useWebsocketApi: WebsocketApiOption<IWebsocketApiClient>;
    protected tradingWsApiClient: IWebsocketApiClient | undefined;
    getTradingWsApiClient(): () => IWebsocketApiClient | undefined;
    protected isTradingWsApiConfigured(): boolean;
    protected initTradingWsApiClient(): void;
    protected sendTradingWsRequest<T>(method: string, params: Record<string, any>, timeoutMs?: number): Promise<TradingWsRequestResult<T>>;
    protected destroyTradingWsApiClient(): void;
    private createTradingWsApiClient;
    protected handleWebSocket(url: string, topics: string[], callback: Function, parser: Function, title: string, statusCallback?: (status: SocketStatus) => void, auth?: boolean): Promise<HandleWebSocket>;
    private generateHmacSignature;
    closeAllSockets(): void;
    closeById(id: string): void;
    private parseDepth;
    private parseKline;
    private parseBookTicker;
    private parseBookTickerSpot;
    private parseTrade;
    /**
     * Maps Bybit order statuses to unified format (Binance standard)
     * Bybit statuses: Created, New, Rejected, PartiallyFilled, PartiallyFilled (Cancelled), Filled, Cancelled, Untriggered, Triggered, Deactivated
     * Unified statuses: NEW, PARTIALLY_FILLED, FILLED, CANCELED, PENDING_CANCEL, REJECTED, EXPIRED, PENDING, TRIGGERED, FINISHED
     */
    private mapBybitOrderStatus;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    private parseFunding;
    fundingStream(symbols: string[], callback: (data: import("../core/types.js").FundingData) => void, statusCallback?: (status: SocketStatus) => void, _options?: FundingStreamOptions): Promise<HandleWebSocket>;
}
//# sourceMappingURL=BybitStreams.d.ts.map