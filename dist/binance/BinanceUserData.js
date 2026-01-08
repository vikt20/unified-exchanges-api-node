"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BinanceFutures_js_1 = __importDefault(require("./BinanceFutures.js"));
const events_1 = require("events");
/**
 * BinanceUserData - Reference implementation of IUserDataManager
 *
 * Manages local user data state (positions, orders) specifically for Binance Futures.
 * Uses a static EventEmitter to facilitate communication between the data manager
 * and UI/Bot components.
 */
class BinanceUserData extends BinanceFutures_js_1.default {
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret);
    }
    /**
     * Shared Emitter for all BinanceUserData instances.
     * Components can subscribe to this to receive live updates.
     */
    static Emitter = new events_1.EventEmitter();
    // --- Outbound Events (Broadcasts) ---
    /** Emitted when a position's data changes for a symbol */
    static POSITION_EVENT = 'position';
    /** Emitted when the list of open orders changes for a symbol */
    static ORDER_EVENT = 'order';
    // --- Inbound Events (Requests) ---
    /** Listen for this to re-emit the current position state */
    static TRIGGER_POSITION_EVENT = 'triggerPosition';
    /** Listen for this to re-emit the current orders state */
    static TRIGGER_ORDER_EVENT = 'triggerOrder';
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData = {
        positions: [],
        orders: []
    };
    async init() {
        BinanceUserData.Emitter.on(BinanceUserData.TRIGGER_POSITION_EVENT, this.emitPosition);
        BinanceUserData.Emitter.on(BinanceUserData.TRIGGER_ORDER_EVENT, this.emitOrders);
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }
    emitPosition = (symbol) => {
        BinanceUserData.Emitter.emit(BinanceUserData.POSITION_EVENT, symbol, this.userData.positions.find(p => p.symbol === symbol));
    };
    emitOrders = (symbol) => {
        BinanceUserData.Emitter.emit(BinanceUserData.ORDER_EVENT, symbol, this.userData.orders.filter(order => order.symbol === symbol));
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
        //Emit event to listeners
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
        //Emit event to listeners
        this.emitPosition(symbol);
    };
}
exports.default = BinanceUserData;
