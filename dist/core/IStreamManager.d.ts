/**
 * IStreamManager - Unified Stream Manager Interface
 *
 * Extracted from BinanceStreams - Binance is the reference implementation.
 * All exchanges must implement this interface for WebSocket streams.
 */
import { IBinanceWebsocketApiClient } from '../binance/BinanceWebsocketApi.js';
import type { KlineData, DepthData, BookTickerData, TradeData, FundingData, FundingStreamOptions, UserData, HandleWebSocket, SocketStatus } from './types.js';
/**
 * Unified Stream Manager Interface
 *
 * Defines the standard API for WebSocket streams.
 * Method signatures match existing Binance implementation.
 */
export interface IStreamManager {
    closeAllSockets(): void;
    closeById(id: string): void;
    getTradingWsApiClient(): () => IBinanceWebsocketApiClient | undefined;
    spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels?: number): Promise<HandleWebSocket>;
    spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
    fundingStream(symbols: string[], callback: (data: FundingData) => void, statusCallback?: (status: SocketStatus) => void, options?: FundingStreamOptions): Promise<HandleWebSocket>;
    futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket>;
}
//# sourceMappingURL=IStreamManager.d.ts.map