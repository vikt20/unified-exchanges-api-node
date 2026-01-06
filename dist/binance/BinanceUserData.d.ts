import { IUserDataManager } from "../core/IUserDataManager.js";
import { OrderData, PositionData } from "./BinanceBase.js";
import BinanceFutures from "./BinanceFutures.js";
import { UserData as WebSocketUserData } from "./BinanceStreams.js";
import { EventEmitter } from 'events';
export type CustomUserData = {
    positions: PositionData[];
    orders: OrderData[];
};
/**
 * BinanceUserData - Reference implementation of IUserDataManager
 *
 * Manages local user data state (positions, orders) specifically for Binance Futures.
 * Uses a static EventEmitter to facilitate communication between the data manager
 * and UI/Bot components.
 */
export default class BinanceUserData extends BinanceFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string);
    /**
     * Shared Emitter for all BinanceUserData instances.
     * Components can subscribe to this to receive live updates.
     */
    static Emitter: EventEmitter;
    /** Emitted when a position's data changes for a symbol */
    static POSITION_EVENT: string;
    /** Emitted when the list of open orders changes for a symbol */
    static ORDER_EVENT: string;
    /** Listen for this to re-emit the current position state */
    static TRIGGER_POSITION_EVENT: string;
    /** Listen for this to re-emit the current orders state */
    static TRIGGER_ORDER_EVENT: string;
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: CustomUserData;
    init(): Promise<[import("./BinanceStreams.js").HandleWebSocket, void, void]>;
    emitPosition: (symbol: string) => void;
    emitOrders: (symbol: string) => void;
    handleUserData: (data: WebSocketUserData) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
}
//# sourceMappingURL=BinanceUserData.d.ts.map