import { IUserDataManager, IUserDataState, PositionUpdateCallback, OrderUpdateCallback, StatusUpdateCallback, Unsubscribe } from "../core/IUserDataManager.js";
import OkxFutures from "./OkxFutures.js";
import { PositionData, OrderData, SocketStatus, UserData, ExtractedInfo } from "../core/types.js";
/**
 * OkxUserData - Implementation of IUserDataManager for Okx
 *
 * Manages local user data state (positions, orders) specifically for Okx Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
export default class OkxUserData extends OkxFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string, apiPassphrase: string, exchangeInfoFutures?: ExtractedInfo[]);
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: IUserDataState;
    /**
     * Private storage for multiple position update callbacks
     */
    private positionCallbacks;
    /**
     * Private storage for multiple order update callbacks
     */
    private orderCallbacks;
    /**
     * Private storage for multiple status update callbacks
     */
    private statusCallbacks;
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
     * Register a callback to receive status updates
     * @returns Unsubscribe function to remove this callback
     */
    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe;
    /**
     * Manually trigger position update callback for a specific symbol
     */
    triggerPositionUpdate(symbol: string): void;
    /**
     * Manually trigger order update callback for a specific symbol
     */
    triggerOrderUpdate(symbol: string): void;
    init(): Promise<unknown>;
    destroy(): void;
    /**
     * Internal method to emit position update via callbacks
     */
    private emitPosition;
    /**
     * Internal method to emit order update via callbacks
     */
    private emitOrders;
    handleUserData: (data: UserData) => void;
    handleUserStatus: (status: SocketStatus) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
}
//# sourceMappingURL=OkxUserData.d.ts.map