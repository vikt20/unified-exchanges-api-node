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
 *    - All incoming WebSocket data MUST update the local `userData` state before emitting events.
 * 
 * 3. TWO-WAY SUBSCRIPTION SYSTEM
 *    The manager uses an EventEmitter (often static) to facilitate communication:
 *    - BROADCAST (Outbound): When `userData` is updated (e.g., via WebSocket), the manager 
 *      emits `'position'` or `'order'` events to notify subscribers.
 *    - TRIGGER (Inbound): The manager listens for `'triggerPosition'` or `'triggerOrder'` events.
 *      When received, it re-emits the CURRENT local state for the requested symbol.
 *    - This allows UI components or bots to request the "current state" through the same 
 *      event pipeline they use for live updates.
 * 
 * 4. STATE MUTATION RULES
 *    - Orders: Should be added on 'NEW' status and removed on 'FILLED', 'CANCELED', or 'EXPIRED'.
 *    - Positions: Should be updated or replaced in the local array whenever an account update occurs.
 */

import type { OrderData, PositionData } from './types.js';

/**
 * User data state structure
 * Represents the current active state of a user's account.
 */
export interface IUserDataState {
    /** List of currently open positions */
    positions: PositionData[];
    /** List of currently open (active) orders */
    orders: OrderData[];
}

/**
 * Unified User Data Manager Interface
 * 
 * Defensive and reactive manager for user account state.
 */
export interface IUserDataManager {
    /**
     * Local storage of current user data state.
     * This is the "Single Source of Truth" updated by REST/WebSockets.
     */
    userData: IUserDataState;

    /**
     * Initialize the user data manager.
     * 1. Set up event listeners for Trigger events.
     * 2. Start WebSocket User Data stream.
     * 3. Fetch initial REST snapshots of orders and positions.
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
}
