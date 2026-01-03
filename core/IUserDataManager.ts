/**
 * IUserDataManager - Unified User Data Manager Interface
 * 
 * Extracted from BinanceUserData - Binance is the reference implementation.
 * Manages local state of user positions and orders.
 */

import type { OrderData, PositionData } from './types.js';

/**
 * User data state structure
 */
export interface IUserDataState {
    positions: PositionData[];
    orders: OrderData[];
}

/**
 * Unified User Data Manager Interface
 * 
 * Defines the standard API for managing user data state.
 * Method signatures match existing Binance implementation.
 */
export interface IUserDataManager {
    /**
     * Current user data state (positions and orders)
     */
    userData: IUserDataState;

    /**
     * Initialize the user data manager.
     * Sets up WebSocket streams and fetches initial state.
     */
    init(): Promise<unknown>;

    /**
     * Request all open orders from the exchange
     */
    requestAllOrders(): Promise<void>;

    /**
     * Request all open positions from the exchange
     */
    requestAllPositions(): Promise<void>;
}
