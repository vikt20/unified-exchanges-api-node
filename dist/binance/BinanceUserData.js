"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BinanceFutures_js_1 = __importDefault(require("./BinanceFutures.js"));
/**
 * BinanceUserData - Reference implementation of IUserDataManager
 *
 * Manages local user data state (positions, orders) specifically for Binance Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
class BinanceUserData extends BinanceFutures_js_1.default {
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
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }
    destroy() {
        this.closeListenKey();
        this.closeAllSockets();
        // Clear all registered callbacks
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
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    };
    handleUserData = (data) => {
        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData)
                    data.accountData.positions?.forEach(this.setPosition);
                break;
            case "ORDER_TRADE_UPDATE":
                // console.log(data.orderData)
                if (data.orderData)
                    this.setOrders(data.orderData);
                break;
            case "listenKeyExpired":
                throw new Error("listenKeyExpired");
                break;
            default:
                // console.log(`No event found: `, data)
                break;
        }
        // console.log(userData);
    };
    async requestAllOrders() {
        const request = await this.getOpenOrders();
        if (!request.success || !request.data) {
            throw new Error(`getOpenOrders() - ${request.errors}`);
        }
        this.userData.orders = request.data;
    }
    async requestAllPositions() {
        const request = await this.getOpenPositions();
        if (!request.success || !request.data) {
            throw new Error(`getOpenPositions() - ${request.errors}`);
        }
        this.userData.positions = request.data;
    }
    setOrders = async (data) => {
        const symbol = data.symbol;
        // console.log(data);
        if (data.orderType === "MARKET")
            return;
        switch (data.orderStatus) {
            case "CANCELED":
            case "FILLED":
            case "REJECTED":
            case "EXPIRED":
            case "FINISHED":
                // case "TRIGGERED":
                this.userData.orders = this.userData.orders.filter(order => order.clientOrderId !== data.clientOrderId);
                break;
            case "NEW":
                this.userData.orders.push(data);
                break;
            default:
                return;
        }
        //Call callback for listeners
        this.emitOrders(symbol);
    };
    setPosition = async (data) => {
        const symbol = data.symbol;
        const position = this.userData.positions.find(p => p.symbol === symbol);
        if (typeof position === 'undefined') {
            this.userData.positions.push(data);
        }
        else {
            this.userData.positions = this.userData.positions.map(p => {
                if (p.symbol === symbol) {
                    return data;
                }
                return p;
            });
        }
        //Call callback for listeners
        this.emitPosition(symbol);
    };
}
exports.default = BinanceUserData;
