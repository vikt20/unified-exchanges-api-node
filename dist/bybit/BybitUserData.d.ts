import { IUserDataManager, IUserDataState, BalanceUpdateCallback, PositionUpdateCallback, OrderUpdateCallback, StatusUpdateCallback, Unsubscribe } from "../core/IUserDataManager.js";
import BybitFutures from "./BybitFutures.js";
import { PositionData, OrderData, SocketStatus, UserData } from "../core/types.js";
/**
 * BybitUserData - Implementation of IUserDataManager for Bybit
 *
 * Manages local user data state (positions, orders) specifically for Bybit Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
export default class BybitUserData extends BybitFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string);
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: IUserDataState;
    /**
     * Private storage for multiple position update callbacks
     */
    private positionCallbacks;
    private balanceCallbacks;
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
    onBalanceUpdate(callback: BalanceUpdateCallback): Unsubscribe;
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
    requestAllBalances(): Promise<void>;
    triggerBalanceUpdate(asset: string): void;
    private setBalance;
    private emitBalance;
    private replaceBalances;
    setPosition: (data: PositionData) => Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
}
//# sourceMappingURL=BybitUserData.d.ts.map