"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BybitFutures_js_1 = __importDefault(require("./BybitFutures.js"));
/**
 * BybitUserData - Implementation of IUserDataManager for Bybit
 *
 * Manages local user data state (positions, orders) specifically for Bybit Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
class BybitUserData extends BybitFutures_js_1.default {
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret);
    }
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData = {
        positions: [],
        orders: []
    };
    /**
     * Private storage for multiple position update callbacks
     */
    positionCallbacks = new Set();
    /**
     * Private storage for multiple order update callbacks
     */
    orderCallbacks = new Set();
    /**
     * Register a callback to receive position updates
     * @returns Unsubscribe function to remove this callback
     */
    onPositionUpdate(callback) {
        this.positionCallbacks.add(callback);
        return () => {
            this.positionCallbacks.delete(callback);
        };
    }
    /**
     * Register a callback to receive order updates
     * @returns Unsubscribe function to remove this callback
     */
    onOrderUpdate(callback) {
        this.orderCallbacks.add(callback);
        return () => {
            this.orderCallbacks.delete(callback);
        };
    }
    /**
     * Manually trigger position update callback for a specific symbol
     */
    triggerPositionUpdate(symbol) {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    }
    /**
     * Manually trigger order update callback for a specific symbol
     */
    triggerOrderUpdate(symbol) {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    }
    async init() {
        // Connect Stream and fetch Snapshots
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }
    destroy() {
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.orderCallbacks.clear();
    }
    /**
     * Internal method to emit position update via callbacks
     */
    emitPosition = (symbol) => {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    };
    /**
     * Internal method to emit order update via callbacks
     */
    emitOrders = (symbol) => {
        const orders = this.userData.orders.filter(o => o.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    };
    handleUserData = (data) => {
        // handle incoming ws events
        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData && data.accountData.positions) {
                    data.accountData.positions.forEach(this.setPosition);
                }
                break;
            case "ORDER_TRADE_UPDATE":
                if (data.orderData) {
                    this.setOrders(data.orderData);
                }
                break;
            default:
                // console.log("Bybit Unhandled User Event", data.event);
                break;
        }
    };
    async requestAllOrders() {
        // Fetch snapshot
        const res = await this.getOpenOrders(); // defined in BybitFutures
        if (res.success && res.data) {
            this.userData.orders = res.data;
        }
        else {
            console.error("BybitUserData: Failed to fetch open orders", res.errors);
        }
    }
    async requestAllPositions() {
        const res = await this.getOpenPositions(); // defined in BybitFutures
        if (res.success && res.data) {
            this.userData.positions = res.data;
        }
        else {
            console.error("BybitUserData: Failed to fetch open positions", res.errors);
        }
    }
    setPosition = async (data) => {
        const symbol = data.symbol;
        const idx = this.userData.positions.findIndex(p => p.symbol === symbol && p.positionDirection === data.positionDirection);
        // Note: Bybit allows Hedge mode (Two positions per symbol).
        // Identifier should be Symbol + Direction.
        if (idx === -1) {
            this.userData.positions.push(data);
        }
        else {
            this.userData.positions[idx] = data;
        }
        // Call callback for listeners
        this.emitPosition(symbol);
    };
    setOrders = async (data) => {
        const symbol = data.symbol;
        // Logic similar to BinanceUserData
        if (data.orderType === 'MARKET')
            return; // usually don't track market orders in open orders list
        const status = data.orderStatus;
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) {
            // Remove
            this.userData.orders = this.userData.orders.filter(o => o.clientOrderId !== data.clientOrderId);
        }
        else if (status === 'NEW' || status === 'PARTIALLY_FILLED') {
            // Add or Update
            const idx = this.userData.orders.findIndex(o => o.clientOrderId === data.clientOrderId);
            if (idx === -1) {
                this.userData.orders.push(data);
            }
            else {
                this.userData.orders[idx] = data;
            }
        }
        // Call callback for listeners
        this.emitOrders(symbol);
    };
}
exports.default = BybitUserData;
