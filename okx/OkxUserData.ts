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

    constructor(apiKey: string, apiSecret: string, apiPassphrase: string, exchangeInfoFutures?: ExtractedInfo[]) {
        super(apiKey, apiSecret, apiPassphrase, false, exchangeInfoFutures);
    }

    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData: IUserDataState = {
        positions: [],
        orders: []
    }

    /**
     * Private storage for multiple position update callbacks
     */
    private positionCallbacks = new Set<PositionUpdateCallback>();

    /**
     * Private storage for multiple order update callbacks
     */
    private orderCallbacks = new Set<OrderUpdateCallback>();

    /**
     * Private storage for multiple status update callbacks
     */
    private statusCallbacks = new Set<StatusUpdateCallback>();

    /**
     * Register a callback to receive position updates
     * @returns Unsubscribe function to remove this callback
     */
    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe {
        this.positionCallbacks.add(callback);

        return () => {
            this.positionCallbacks.delete(callback);
        };
    }

    /**
     * Register a callback to receive order updates
     * @returns Unsubscribe function to remove this callback
     */
    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe {
        this.orderCallbacks.add(callback);

        return () => {
            this.orderCallbacks.delete(callback);
        };
    }

    /**
     * Register a callback to receive status updates
     * @returns Unsubscribe function to remove this callback
     */
    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe {
        this.statusCallbacks.add(callback);

        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    /**
     * Manually trigger position update callback for a specific symbol
     */
    triggerPositionUpdate(symbol: string): void {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    }

    /**
     * Manually trigger order update callback for a specific symbol
     */
    triggerOrderUpdate(symbol: string): void {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    }

    async init(): Promise<unknown> {
        // Connect Stream and fetch Snapshots
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData, this.handleUserStatus),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }

    public destroy(): void {
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.orderCallbacks.clear();
        this.statusCallbacks.clear();
    }

    /**
     * Internal method to emit position update via callbacks
     */
    private emitPosition = (symbol: string) => {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    }

    /**
     * Internal method to emit order update via callbacks
     */
    private emitOrders = (symbol: string) => {
        const orders = this.userData.orders.filter(o => o.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    }

    handleUserData = (data: UserData) => {
        // handle incoming ws events
        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData && data.accountData.positions) {
                    data.accountData.positions.forEach(this.setPosition);
                }
                break;
            case "ORDER_TRADE_UPDATE":
                if (data.orderData) {
                    data.orderData.forEach(this.setOrders);
                }
                break;
            default:
                // console.log("Okx Unhandled User Event", data.event);
                break;
        }
    }

    handleUserStatus = (status: SocketStatus) => {
        for (const cb of this.statusCallbacks) {
            cb(status);
        }
    }

    async requestAllOrders(): Promise<void> {
        // Fetch snapshot
        const res = await this.getOpenOrders(); // defined in OkxFutures
        if (res.success && res.data) {
            this.userData.orders = res.data;
        } else {
            console.error("OkxUserData: Failed to fetch open orders", res.errors);
        }
    }

    async requestAllPositions(): Promise<void> {
        const res = await this.getOpenPositions(); // defined in OkxFutures
        if (res.success && res.data) {
            this.userData.positions = res.data;
        } else {
            console.error("OkxUserData: Failed to fetch open positions", res.errors);
        }
    }

    setPosition = async (data: PositionData): Promise<void> => {
        const symbol = data.symbol;

        const position = this.userData.positions.find(p => p.symbol === symbol);

        if (typeof position === 'undefined') {
            this.userData.positions.push(data);
        } else {
            this.userData.positions = this.userData.positions.map(p => {
                if (p.symbol === symbol) {
                    return data
                }
                return p
            })
        }
        //Call callback for listeners
        this.emitPosition(symbol)
    }

    setOrders = async (data: OrderData): Promise<void> => {
        const symbol = data.symbol;

        // Logic similar to BinanceUserData
        if (data.orderType === 'MARKET') return; // usually don't track market orders in open orders list

        const status = data.orderStatus;
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) {
            // Remove
            this.userData.orders = this.userData.orders.filter(o => o.clientOrderId !== data.clientOrderId);
        } else if (status === 'NEW' || status === 'PARTIALLY_FILLED') {
            // Add or Update
            const idx = this.userData.orders.findIndex(o => o.clientOrderId === data.clientOrderId);
            if (idx === -1) {
                this.userData.orders.push(data);
            } else {
                this.userData.orders[idx] = data;
            }
        }

        // Call callback for listeners
        this.emitOrders(symbol);
    }
}

