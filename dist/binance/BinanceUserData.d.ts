import { IUserDataManager, BalanceUpdateCallback, PositionUpdateCallback, OrderUpdateCallback, StatusUpdateCallback, Unsubscribe } from "../core/IUserDataManager.js";
import { BalanceData, OrderData, PositionData } from "./BinanceBase.js";
import BinanceFutures from "./BinanceFutures.js";
import { SocketStatus, UserData } from "../core/types.js";
export type CustomUserData = {
    balances: BalanceData[];
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
    private static readonly POSITION_RISK_REFRESH_INTERVAL_MS;
    private static readonly POSITION_RISK_DEBOUNCE_MS;
    private positionRiskRefreshTimers;
    private positionRiskRefreshInFlight;
    private positionRiskRefreshPending;
    private positionRiskLastRequestAt;
    private readonly enablePositionRiskEnrichment;
    /**
     *
     * @param apiKey
     * @param apiSecret
     * @param enablePositionRiskEnrichment | If true, will automatically refresh position risk data (leverage, liquidation price) after account updates.
     */
    constructor(apiKey: string, apiSecret: string, enablePositionRiskEnrichment?: boolean);
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: CustomUserData;
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
    triggerBalanceUpdate(asset: string): void;
    init(): Promise<[import("./BinanceStreams.js").HandleWebSocket, void, void, void]>;
    destroy(): void;
    /**
     * Internal method to emit position update via callbacks
     */
    private emitPosition;
    /**
     * Internal method to emit order update via callbacks
     */
    private emitOrders;
    private emitBalance;
    handleUserData: (data: UserData) => void;
    handleUserStatus: (status: SocketStatus) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    requestAllBalances(): Promise<void>;
    setBalance: (data: BalanceData) => void;
    setOrders: (data: OrderData) => Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
    private schedulePositionRiskRefresh;
    private refreshPositionRisk;
}
//# sourceMappingURL=BinanceUserData.d.ts.map