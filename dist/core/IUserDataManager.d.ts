/**
 * IUserDataManager - Unified User Data Manager Interface
 *
 * This interface defines how user-specific data (positions, open orders) should be
 * tracked and synchronized across different exchange implementations.
 *
 * REFERENCE IMPLEMENTATION: BinanceUserData.ts
 *
 * CORE ARCHITECTURE PRINCIPLES:
 * 1. SINGLE SOURCE OF TRUTH (userData)
 *    The manager maintains a local `userData` object containing all active positions
 *    and open orders. This state must be kept in sync using a combination of REST
 *    snapshots and WebSocket updates.
 *
 * 2. SNAPSHOT + STREAM SYNC
 *    - On `init()`, the manager fetches initial snapshots via REST (requestAllOrders, requestAllPositions).
 *    - It simultaneously opens a User Data WebSocket stream to receive real-time updates.
 *    - All incoming WebSocket data MUST update the local `userData` state before calling callbacks.
 *
 * 3. CALLBACK-BASED UPDATES
 *    The manager uses instance-based callbacks for communication:
 *    - AUTOMATIC UPDATES: When `userData` is updated (e.g., via WebSocket), the manager
 *      calls the registered callbacks (`onPositionUpdate`, `onOrderUpdate`) with the updated data.
 *    - MANUAL TRIGGERS: Users can call `triggerPositionUpdate(symbol)` or `triggerOrderUpdate(symbol)`
 *      to manually request the CURRENT local state for a specific symbol via callbacks.
 *    - This allows UI components or bots to both receive live updates AND request
 *      the current state on demand through the same callback interface.
 *
 * 4. STATE MUTATION RULES
 *    - Orders: Should be added on 'NEW' status and removed on 'FILLED', 'CANCELED', or 'EXPIRED'.
 *    - Positions: Should be updated or replaced in the local array whenever an account update occurs.
 */
import { IExchangeClient } from './IExchangeClient.js';
import type { OrderData, PositionData } from './types.js';
/**
 * User data state structure
 * Represents the current active state of a user's account.
 *  start with init() to fetch initial snapshots and start WebSocket stream
 */
export interface IUserDataState {
    /** List of currently open positions */
    positions: PositionData[];
    /** List of currently open (active) orders */
    orders: OrderData[];
}
/**
 * Unsubscribe function type
 * Call this function to remove a registered callback
 */
export type Unsubscribe = () => void;
/**
 * Callback function type for position updates
 * @param symbol - The trading pair symbol
 * @param position - The updated position data, or undefined if no position exists
 */
export type PositionUpdateCallback = (symbol: string, position: PositionData | undefined) => void;
/**
 * Callback function type for order updates
 * @param symbol - The trading pair symbol
 * @param orders - Array of open orders for this symbol
 */
export type OrderUpdateCallback = (symbol: string, orders: OrderData[]) => void;
/**
 * Unified User Data Manager Interface
 *
 * Defensive and reactive manager for user account state.
 */
export interface IUserDataManager extends IExchangeClient {
    /**
     * Local storage of current user data state.
     * This is the "Single Source of Truth" updated by REST/WebSockets.
     */
    userData: IUserDataState;
    /**
     * Initialize the user data manager.
     * 1. Start WebSocket User Data stream.
     * 2. Fetch initial REST snapshots of orders and positions.
     */
    init(): Promise<unknown>;
    /**
     * Fetch all open orders from the exchange and update local `userData.orders`.
     * This is typically used for the initial snapshot or manual resync.
     */
    requestAllOrders(): Promise<void>;
    /**
     * Fetch all open positions from the exchange and update local `userData.positions`.
     * This is typically used for the initial snapshot or manual resync.
     */
    requestAllPositions(): Promise<void>;
    /**
     * Register a callback to receive position updates.
     * This callback will be invoked whenever a position is updated via WebSocket
     * or when triggerPositionUpdate() is called.
     *
     * @param callback - Function to call with position updates
     * @returns Unsubscribe function to remove this callback
     *
     * @example
     * ```typescript
     * const exchange = ExchangeFactory.create(ExchangeList.BINANCE, apiKey, apiSecret);
     * await exchange.userData.init();
     *
     * const unsubscribe = exchange.userData.onPositionUpdate((symbol, position) => {
     *   console.log(`Position update for ${symbol}:`, position);
     * });
     *
     * // Later, to stop receiving updates:
     * unsubscribe();
     * ```
     */
    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe;
    /**
     * Register a callback to receive order updates.
     * This callback will be invoked whenever orders change via WebSocket
     * or when triggerOrderUpdate() is called.
     *
     * @param callback - Function to call with order updates
     * @returns Unsubscribe function to remove this callback
     *
     * @example
     * ```typescript
     * const exchange = ExchangeFactory.create(ExchangeList.BINANCE, apiKey, apiSecret);
     * await exchange.userData.init();
     *
     * const unsubscribe = exchange.userData.onOrderUpdate((symbol, orders) => {
     *   console.log(`Orders for ${symbol}:`, orders);
     * });
     *
     * // Later, to stop receiving updates:
     * unsubscribe();
     * ```
     */
    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe;
    /**
     * Manually trigger a position update callback for a specific symbol.
     * This will call the registered onPositionUpdate callback with the current
     * position data for the specified symbol.
     *
     * @param symbol - The trading pair symbol to get position data for
     *
     * @example
     * ```typescript
     * // Get current position state on demand
     * exchange.userData.triggerPositionUpdate('BTCUSDT');
     * ```
     */
    triggerPositionUpdate(symbol: string): void;
    /**
     * Manually trigger an order update callback for a specific symbol.
     * This will call the registered onOrderUpdate callback with the current
     * orders for the specified symbol.
     *
     * @param symbol - The trading pair symbol to get orders for
     *
     * @example
     * ```typescript
     * // Get current orders state on demand
     * exchange.userData.triggerOrderUpdate('BTCUSDT');
     * ```
     */
    triggerOrderUpdate(symbol: string): void;
    /**
     * Destroy the user data manager.
     * This will close the WebSocket connection and remove all callbacks.
     */
    destroy(): void;
}
//# sourceMappingURL=IUserDataManager.d.ts.map