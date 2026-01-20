import { IUserDataManager, PositionUpdateCallback, OrderUpdateCallback, Unsubscribe } from "../core/IUserDataManager.js";
import { OrderData, PositionData } from "./BinanceBase.js";
import BinanceFutures from "./BinanceFutures.js";
import { UserData as WebSocketUserData } from "./BinanceStreams.js";
export type CustomUserData = {
    positions: PositionData[];
    orders: OrderData[];
};
/**
 * BinanceUserData - Reference implementation of IUserDataManager
 *
 * Manages local user data state (positions, orders) specifically for Binance Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
export default class BinanceUserData extends BinanceFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string);
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: CustomUserData;
    /**
     * Private storage for multiple position update callbacks
     */
    private positionCallbacks;
    /**
     * Private storage for multiple order update callbacks
     */
    private orderCallbacks;
    /**
     * Register a callback to receive position updates
     * @returns Unsubscribe function to remove this callback
     */
    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe;
    /**
     * Register a callback to receive order updates
     * @returns Unsubscribe function to remove this callback
     */
    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe;
    /**
     * Manually trigger position update callback for a specific symbol
     */
    triggerPositionUpdate(symbol: string): void;
    /**
     * Manually trigger order update callback for a specific symbol
     */
    triggerOrderUpdate(symbol: string): void;
    init(): Promise<[import("./BinanceStreams.js").HandleWebSocket, void, void]>;
    destroy(): void;
    /**
     * Internal method to emit position update via callbacks
     */
    private emitPosition;
    /**
     * Internal method to emit order update via callbacks
     */
    private emitOrders;
    handleUserData: (data: WebSocketUserData) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
}
//# sourceMappingURL=BinanceUserData.d.ts.map