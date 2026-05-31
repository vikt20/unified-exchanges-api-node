import KrakenFutures from './KrakenFutures.js';
/**
 * KrakenUserData - Implementation of IUserDataManager for Kraken Futures.
 *
 * Maintains local open positions and open orders from an initial REST snapshot
 * and Kraken Futures authenticated WebSocket updates.
 */
export default class KrakenUserData extends KrakenFutures {
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
    }
    userData = {
        positions: [],
        orders: []
    };
    positionCallbacks = new Set();
    orderCallbacks = new Set();
    statusCallbacks = new Set();
    onPositionUpdate(callback) {
        this.positionCallbacks.add(callback);
        return () => {
            this.positionCallbacks.delete(callback);
        };
    }
    onOrderUpdate(callback) {
        this.orderCallbacks.add(callback);
        return () => {
            this.orderCallbacks.delete(callback);
        };
    }
    onStatusUpdate(callback) {
        this.statusCallbacks.add(callback);
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }
    triggerPositionUpdate(symbol) {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    }
    triggerOrderUpdate(symbol) {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    }
    async init() {
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData, this.handleUserStatus),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }
    destroy() {
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.orderCallbacks.clear();
        this.statusCallbacks.clear();
    }
    handleUserData = (data) => {
        switch (data.event) {
            case 'ACCOUNT_UPDATE':
                if (data.accountData?.positions !== undefined) {
                    if (data.updateType === 'SNAPSHOT') {
                        this.replacePositionsSnapshot(data.accountData.positions);
                    }
                    else {
                        data.accountData.positions.forEach(this.setPosition);
                    }
                }
                break;
            case 'ORDER_TRADE_UPDATE':
                if (data.orderData !== undefined) {
                    if (data.updateType === 'SNAPSHOT') {
                        this.replaceOrdersSnapshot(data.orderData);
                    }
                    else {
                        data.orderData.forEach(this.setOrders);
                    }
                }
                break;
            case 'listenKeyExpired':
                void this.init();
                break;
            default:
                break;
        }
    };
    handleUserStatus = (status) => {
        for (const cb of this.statusCallbacks) {
            cb(status);
        }
    };
    async requestAllOrders() {
        const res = await this.getOpenOrders();
        if (res.success && res.data) {
            this.userData.orders = res.data;
        }
        else {
            console.error('KrakenUserData: Failed to fetch open orders', res.errors);
        }
    }
    async requestAllPositions() {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            this.userData.positions = res.data;
        }
        else {
            console.error('KrakenUserData: Failed to fetch open positions', res.errors);
        }
    }
    setPosition = async (data) => {
        const symbol = data.symbol;
        const index = this.userData.positions.findIndex(p => p.symbol === symbol);
        if (!data.isInPosition || data.positionAmount === 0) {
            if (index !== -1) {
                this.userData.positions.splice(index, 1);
            }
            this.emitPosition(symbol);
            return;
        }
        if (index === -1) {
            this.userData.positions.push(data);
        }
        else {
            this.userData.positions[index] = data;
        }
        this.emitPosition(symbol);
    };
    setOrders = async (data) => {
        const symbol = data.symbol;
        if (data.orderType === 'MARKET')
            return;
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(data.orderStatus)) {
            this.userData.orders = this.userData.orders.filter(o => o.clientOrderId !== data.clientOrderId);
        }
        else if (['NEW', 'PARTIALLY_FILLED', 'PENDING'].includes(data.orderStatus)) {
            const index = this.userData.orders.findIndex(o => o.clientOrderId === data.clientOrderId);
            if (index === -1) {
                this.userData.orders.push(data);
            }
            else {
                this.userData.orders[index] = data;
            }
        }
        else {
            return;
        }
        this.emitOrders(symbol);
    };
    replacePositionsSnapshot(positions) {
        const previousSymbols = new Set(this.userData.positions.map(position => position.symbol));
        const activePositions = positions.filter(position => position.isInPosition && position.positionAmount !== 0);
        const nextSymbols = new Set(activePositions.map(position => position.symbol));
        this.userData.positions = activePositions;
        for (const symbol of new Set([...previousSymbols, ...nextSymbols])) {
            this.emitPosition(symbol);
        }
    }
    replaceOrdersSnapshot(orders) {
        const previousSymbols = new Set(this.userData.orders.map(order => order.symbol));
        const activeOrders = orders.filter(order => order.orderType !== 'MARKET' && !this.isTerminalOrder(order));
        const nextSymbols = new Set(activeOrders.map(order => order.symbol));
        this.userData.orders = activeOrders;
        for (const symbol of new Set([...previousSymbols, ...nextSymbols])) {
            this.emitOrders(symbol);
        }
    }
    isTerminalOrder(data) {
        return ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(data.orderStatus);
    }
    emitPosition = (symbol) => {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    };
    emitOrders = (symbol) => {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    };
}
