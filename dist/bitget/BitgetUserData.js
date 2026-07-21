import BitgetFutures from './BitgetFutures.js';
export default class BitgetUserData extends BitgetFutures {
    userData = {
        balances: [],
        positions: [],
        orders: []
    };
    positionCallbacks = new Set();
    balanceCallbacks = new Set();
    orderCallbacks = new Set();
    statusCallbacks = new Set();
    onPositionUpdate(callback) {
        this.positionCallbacks.add(callback);
        return () => this.positionCallbacks.delete(callback);
    }
    onBalanceUpdate(callback) {
        this.balanceCallbacks.add(callback);
        return () => this.balanceCallbacks.delete(callback);
    }
    onOrderUpdate(callback) {
        this.orderCallbacks.add(callback);
        return () => this.orderCallbacks.delete(callback);
    }
    onStatusUpdate(callback) {
        this.statusCallbacks.add(callback);
        return () => this.statusCallbacks.delete(callback);
    }
    triggerPositionUpdate(symbol) {
        const position = this.userData.positions.find(item => item.symbol === symbol);
        for (const callback of this.positionCallbacks)
            callback(symbol, position);
    }
    triggerOrderUpdate(symbol) {
        const orders = this.userData.orders.filter(item => item.symbol === symbol);
        for (const callback of this.orderCallbacks)
            callback(symbol, orders);
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
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.balanceCallbacks.clear();
        this.orderCallbacks.clear();
        this.statusCallbacks.clear();
    }
    async requestAllOrders() {
        const res = await this.getOpenOrders();
        if (res.success && res.data) {
            this.userData.orders = res.data;
        }
        else {
            console.error('BitgetUserData: Failed to fetch open orders', res.errors);
        }
    }
    async requestAllPositions() {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            this.userData.positions = res.data;
        }
        else {
            console.error('BitgetUserData: Failed to fetch open positions', res.errors);
        }
    }
    async requestAllBalances() {
        const res = await this.getBalance();
        if (res.success && res.data)
            this.userData.balances = res.data;
        else
            console.error('BitgetUserData: Failed to fetch balances', res.errors);
    }
    triggerBalanceUpdate(asset) { this.emitBalance(asset); }
    handleUserStatus = (status) => {
        for (const callback of this.statusCallbacks)
            callback(status);
    };
    handleUserData = (data) => {
        if (data.event === 'ACCOUNT_UPDATE' && data.accountData?.balances) {
            if (data.updateType === 'SNAPSHOT')
                this.replaceBalances(data.accountData.balances);
            else
                data.accountData.balances.forEach(this.setBalance);
        }
        if (data.event === 'ACCOUNT_UPDATE' && data.accountData?.positions) {
            if (data.updateType === 'SNAPSHOT') {
                this.replacePositions(data.accountData.positions);
            }
            else {
                data.accountData.positions.forEach(this.setPosition);
            }
        }
        if (data.event === 'ORDER_TRADE_UPDATE' && data.orderData) {
            if (data.updateType === 'SNAPSHOT') {
                this.replaceOrders(data.orderData);
            }
            else {
                data.orderData.forEach(this.setOrder);
            }
        }
        if (data.event === 'listenKeyExpired') {
            void this.init();
        }
    };
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
    setPosition = (position) => {
        const index = this.userData.positions.findIndex(item => item.symbol === position.symbol);
        if (!position.isInPosition || position.positionAmount === 0) {
            if (index >= 0)
                this.userData.positions.splice(index, 1);
        }
        else if (index >= 0) {
            this.userData.positions[index] = position;
        }
        else {
            this.userData.positions.push(position);
        }
        this.emitPosition(position.symbol);
    };
    setOrder = (order) => {
        if (order.orderType === 'MARKET')
            return;
        const terminal = ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(order.orderStatus);
        const index = this.userData.orders.findIndex(item => item.clientOrderId === order.clientOrderId);
        if (terminal) {
            if (index >= 0)
                this.userData.orders.splice(index, 1);
        }
        else if (index >= 0) {
            this.userData.orders[index] = order;
        }
        else {
            this.userData.orders.push(order);
        }
        this.emitOrders(order.symbol);
    };
    replacePositions(positions) {
        const symbols = new Set([...this.userData.positions.map(item => item.symbol), ...positions.map(item => item.symbol)]);
        this.userData.positions = positions.filter(item => item.isInPosition && item.positionAmount !== 0);
        for (const symbol of symbols)
            this.emitPosition(symbol);
    }
    replaceOrders(orders) {
        const symbols = new Set([...this.userData.orders.map(item => item.symbol), ...orders.map(item => item.symbol)]);
        this.userData.orders = orders.filter(item => item.orderType !== 'MARKET' && !this.isTerminal(item));
        for (const symbol of symbols)
            this.emitOrders(symbol);
    }
    isTerminal(order) {
        return ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(order.orderStatus);
    }
    emitPosition(symbol) {
        const position = this.userData.positions.find(item => item.symbol === symbol);
        for (const callback of this.positionCallbacks)
            callback(symbol, position);
    }
    emitOrders(symbol) {
        const orders = this.userData.orders.filter(item => item.symbol === symbol);
        for (const callback of this.orderCallbacks)
            callback(symbol, orders);
    }
}
