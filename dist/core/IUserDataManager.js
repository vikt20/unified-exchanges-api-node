"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
