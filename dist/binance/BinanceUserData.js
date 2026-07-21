import BinanceFutures from "./BinanceFutures.js";
/**
 * BinanceUserData - Reference implementation of IUserDataManager
 *
 * Manages local user data state (positions, orders) specifically for Binance Futures.
 * Uses instance-based callbacks for communication with UI/Bot components.
 */
export default class BinanceUserData extends BinanceFutures {
    static POSITION_RISK_REFRESH_INTERVAL_MS = 1000;
    static POSITION_RISK_DEBOUNCE_MS = 100;
    positionRiskRefreshTimers = new Map();
    positionRiskRefreshInFlight = new Set();
    positionRiskRefreshPending = new Set();
    positionRiskLastRequestAt = new Map();
    enablePositionRiskEnrichment;
    /**
     *
     * @param apiKey
     * @param apiSecret
     * @param enablePositionRiskEnrichment | If true, will automatically refresh position risk data (leverage, liquidation price) after account updates.
     */
    constructor(apiKey, apiSecret, enablePositionRiskEnrichment = false) {
        super(apiKey, apiSecret);
        this.enablePositionRiskEnrichment = enablePositionRiskEnrichment;
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
    triggerBalanceUpdate(asset) {
        this.emitBalance(asset);
    }
    async init() {
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData, this.handleUserStatus),
            this.requestAllOrders(),
            this.requestAllPositions(),
            this.requestAllBalances()
        ]);
    }
    destroy() {
        this.closeListenKey();
        this.closeAllSockets();
        for (const timer of this.positionRiskRefreshTimers.values())
            clearTimeout(timer);
        this.positionRiskRefreshTimers.clear();
        this.positionRiskRefreshInFlight.clear();
        this.positionRiskRefreshPending.clear();
        this.positionRiskLastRequestAt.clear();
        // Clear all registered callbacks
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
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    };
    emitBalance = (asset) => {
        const balance = this.userData.balances.find(item => item.asset === asset);
        for (const cb of this.balanceCallbacks)
            cb(asset, balance);
    };
    handleUserData = (data) => {
        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData) {
                    data.accountData.positions?.forEach(this.setPosition);
                    data.accountData.balances?.forEach(this.setBalance);
                }
                break;
            case "ORDER_TRADE_UPDATE":
                // console.log(data.orderData)
                if (data.orderData)
                    data.orderData.forEach(this.setOrders);
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
    handleUserStatus = (status) => {
        for (const cb of this.statusCallbacks) {
            cb(status);
        }
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
    async requestAllBalances() {
        const request = await this.getBalance();
        if (!request.success || !request.data)
            throw new Error(`getBalance() - ${request.errors}`);
        this.userData.balances = request.data;
    }
    setBalance = (data) => {
        const index = this.userData.balances.findIndex(balance => balance.asset === data.asset);
        if (index === -1)
            this.userData.balances.push(data);
        else
            this.userData.balances[index] = data;
        this.emitBalance(data.asset);
    };
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
        const shouldRefreshRisk = position === undefined || position.positionAmount !== data.positionAmount;
        const nextPosition = position
            ? {
                ...data,
                // Binance ACCOUNT_UPDATE does not include these fields. Keep the
                // last REST values until the rate-limited refresh completes.
                leverage: position.leverage,
                liquidationPrice: position.liquidationPrice
            }
            : data;
        if (typeof position === 'undefined') {
            this.userData.positions.push(nextPosition);
        }
        else {
            this.userData.positions = this.userData.positions.map(p => {
                if (p.symbol === symbol) {
                    return nextPosition;
                }
                return p;
            });
        }
        // Emit the websocket update immediately, then enrich it asynchronously.
        this.emitPosition(symbol);
        if (this.enablePositionRiskEnrichment && shouldRefreshRisk) {
            this.schedulePositionRiskRefresh(symbol);
        }
    };
    schedulePositionRiskRefresh(symbol) {
        this.positionRiskRefreshPending.add(symbol);
        if (this.positionRiskRefreshInFlight.has(symbol) || this.positionRiskRefreshTimers.has(symbol))
            return;
        const elapsed = Date.now() - (this.positionRiskLastRequestAt.get(symbol) ?? 0);
        const delay = Math.max(BinanceUserData.POSITION_RISK_DEBOUNCE_MS, BinanceUserData.POSITION_RISK_REFRESH_INTERVAL_MS - elapsed);
        const timer = setTimeout(() => {
            this.positionRiskRefreshTimers.delete(symbol);
            void this.refreshPositionRisk(symbol);
        }, delay);
        this.positionRiskRefreshTimers.set(symbol, timer);
    }
    async refreshPositionRisk(symbol) {
        if (this.positionRiskRefreshInFlight.has(symbol))
            return;
        this.positionRiskRefreshPending.delete(symbol);
        this.positionRiskRefreshInFlight.add(symbol);
        this.positionRiskLastRequestAt.set(symbol, Date.now());
        const requestedAmount = this.userData.positions.find(position => position.symbol === symbol)?.positionAmount;
        try {
            const response = await this.getPositionRisk({ symbol });
            const risk = response.data?.find(position => position.symbol === symbol);
            const current = this.userData.positions.find(position => position.symbol === symbol);
            // Do not apply a response for an amount that changed while REST was in flight.
            if (response.success && risk && current && current.positionAmount === requestedAmount) {
                this.userData.positions = this.userData.positions.map(position => position.symbol === symbol
                    ? {
                        ...position,
                        leverage: risk.leverage,
                        liquidationPrice: risk.liquidationPrice,
                        marginMode: risk.marginType
                    }
                    : position);
                this.emitPosition(symbol);
            }
        }
        catch (error) {
            console.error(`BinanceUserData: Failed to refresh position risk for ${symbol}`, error);
        }
        finally {
            this.positionRiskRefreshInFlight.delete(symbol);
            if (this.positionRiskRefreshPending.has(symbol))
                this.schedulePositionRiskRefresh(symbol);
        }
    }
}
