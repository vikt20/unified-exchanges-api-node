/**
 * IStreamManager - Unified Stream Manager Interface
 * 
 * Extracted from BinanceStreams - Binance is the reference implementation.
 * All exchanges must implement this interface for WebSocket streams.
 */

import type {
    KlineData,
    DepthData,
    BookTickerData,
    TradeData,
    FundingData,
    UserData,
    HandleWebSocket,
    SocketStatus,
} from './types.js';

/**
 * Unified Stream Manager Interface
 * 
 * Defines the standard API for WebSocket streams.
 * Method signatures match existing Binance implementation.
 */
export interface IStreamManager {
    // ━━ Connection Management ━━
    closeAllSockets(): void;
    closeById(id: string): void;

    // ━━ Depth Streams ━━
    spotDepthStream(
        symbols: string[],
        callback: (data: DepthData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    futuresDepthStream(
        symbols: string[],
        callback: (data: DepthData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    // ━━ Kline/Candlestick Streams ━━
    spotCandleStickStream(
        symbols: string[],
        interval: string,
        callback: (data: KlineData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    futuresCandleStickStream(
        symbols: string[],
        interval: string,
        callback: (data: KlineData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    // ━━ Book Ticker Streams ━━
    spotBookTickerStream(
        symbols: string[],
        callback: (data: BookTickerData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    futuresBookTickerStream(
        symbols: string[],
        callback: (data: BookTickerData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    // ━━ Trade Streams ━━
    spotTradeStream(
        symbols: string[],
        callback: (data: TradeData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    futuresTradeStream(
        symbols: string[],
        callback: (data: TradeData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    // ━━ Funding Data Stream ━━
    fundingStream(
        symbols: string[],
        callback: (data: FundingData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;

    // ━━ User Data Stream ━━
    futuresUserDataStream(
        callback: (data: UserData) => void,
        statusCallback?: (status: SocketStatus) => void
    ): Promise<HandleWebSocket>;
}
