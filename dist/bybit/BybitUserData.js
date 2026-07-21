import BybitFutures from "./BybitFutures.js";
/**
 * BybitUserData - Implementation of IUserDataManager for Bybit
 *
 * Manages local user data state (positions, orders) specifically for Bybit Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
export default class BybitUserData extends BybitFutures {
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret);
    }
    /**
     * Local "Single Source of Truth" for user data.
     * Continuously updated by the WebSocket stream.
     */
    userData = {
        balances: [],
        positions: [],
        orders: []
    };
    /**
     * Private storage for multiple position update callbacks
     */
    positionCallbacks = new Set();
    balanceCallbacks = new Set();
    /**
     * Private storage for multiple order update callbacks
     */
    orderCallbacks = new Set();
    /**
     * Private storage for multiple status update callbacks
     */
    statusCallbacks = new Set();
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
    onBalanceUpdate(callback) {
        this.balanceCallbacks.add(callback);
        return () => this.balanceCallbacks.delete(callback);
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
     * Register a callback to receive status updates
     * @returns Unsubscribe function to remove this callback
     */
    onStatusUpdate(callback) {
        this.statusCallbacks.add(callback);
        return () => {
            this.statusCallbacks.delete(callback);
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
            this.futuresUserDataStream(this.handleUserData, this.handleUserStatus),
            this.requestAllOrders(),
            this.requestAllPositions(),
            this.requestAllBalances()
        ]);
    }
    destroy() {
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.balanceCallbacks.clear();
        this.orderCallbacks.clear();
        this.statusCallbacks.clear();
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
                if (data.accountData?.balances) {
                    if (data.updateType === 'SNAPSHOT')
                        this.replaceBalances(data.accountData.balances);
                    else
                        data.accountData.balances.forEach(this.setBalance);
                }
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
                // console.log("Bybit Unhandled User Event", data.event);
                break;
        }
    };
    handleUserStatus = (status) => {
        for (const cb of this.statusCallbacks) {
            cb(status);
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
    async requestAllBalances() {
        const res = await this.getBalance();
        if (res.success && res.data)
            this.userData.balances = res.data;
        else
            console.error("BybitUserData: Failed to fetch balances", res.errors);
    }
    triggerBalanceUpdate(asset) { this.emitBalance(asset); }
    setBalance = (data) => {
        const index = this.userData.balances.findIndex(balance => balance.asset === data.asset);
        if (index === -1)
            this.userData.balances.push(data);
        else
            this.userData.balances[index] = data;
        this.emitBalance(data.asset);
    };
    emitBalance(asset) {
        const balance = this.userData.balances.find(item => item.asset === asset);
        for (const callback of this.balanceCallbacks)
            callback(asset, balance);
    }
    replaceBalances(balances) {
        const assets = new Set([...this.userData.balances.map(item => item.asset), ...balances.map(item => item.asset)]);
        this.userData.balances = balances;
        for (const asset of assets)
            this.emitBalance(asset);
    }
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
