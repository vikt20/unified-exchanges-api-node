import {
    IUserDataManager,
    IUserDataState,
    BalanceUpdateCallback,
    OrderUpdateCallback,
    PositionUpdateCallback,
    StatusUpdateCallback,
    Unsubscribe
} from '../core/IUserDataManager.js';
import type { BalanceData, OrderData, PositionData, SocketStatus, UserData } from '../core/types.js';
import BitgetFutures from './BitgetFutures.js';

export default class BitgetUserData extends BitgetFutures implements IUserDataManager {
    userData: IUserDataState = {
        balances: [],
        positions: [],
        orders: []
    };

    private positionCallbacks = new Set<PositionUpdateCallback>();
    private balanceCallbacks = new Set<BalanceUpdateCallback>();
    private orderCallbacks = new Set<OrderUpdateCallback>();
    private statusCallbacks = new Set<StatusUpdateCallback>();

    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe {
        this.positionCallbacks.add(callback);
        return () => this.positionCallbacks.delete(callback);
    }

    onBalanceUpdate(callback: BalanceUpdateCallback): Unsubscribe {
        this.balanceCallbacks.add(callback);
        return () => this.balanceCallbacks.delete(callback);
    }

    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe {
        this.orderCallbacks.add(callback);
        return () => this.orderCallbacks.delete(callback);
    }

    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe {
        this.statusCallbacks.add(callback);
        return () => this.statusCallbacks.delete(callback);
    }

    triggerPositionUpdate(symbol: string): void {
        const position = this.userData.positions.find(item => item.symbol === symbol);
        for (const callback of this.positionCallbacks) callback(symbol, position);
    }

    triggerOrderUpdate(symbol: string): void {
        const orders = this.userData.orders.filter(item => item.symbol === symbol);
        for (const callback of this.orderCallbacks) callback(symbol, orders);
    }

    async init(): Promise<unknown> {
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData, this.handleUserStatus),
            this.requestAllOrders(),
            this.requestAllPositions(),
            this.requestAllBalances()
        ]);
    }

    destroy(): void {
        this.closeAllSockets();
        this.positionCallbacks.clear();
        this.balanceCallbacks.clear();
        this.orderCallbacks.clear();
        this.statusCallbacks.clear();
    }

    async requestAllOrders(): Promise<void> {
        const res = await this.getOpenOrders();
        if (res.success && res.data) {
            this.userData.orders = res.data;
        } else {
            console.error('BitgetUserData: Failed to fetch open orders', res.errors);
        }
    }

    async requestAllPositions(): Promise<void> {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            this.userData.positions = res.data;
        } else {
            console.error('BitgetUserData: Failed to fetch open positions', res.errors);
        }
    }

    async requestAllBalances(): Promise<void> {
        const res = await this.getBalance();
        if (res.success && res.data) this.userData.balances = res.data;
        else console.error('BitgetUserData: Failed to fetch balances', res.errors);
    }

    triggerBalanceUpdate(asset: string): void { this.emitBalance(asset); }

    private handleUserStatus = (status: SocketStatus): void => {
        for (const callback of this.statusCallbacks) callback(status);
    };

    private handleUserData = (data: UserData): void => {
        if (data.event === 'ACCOUNT_UPDATE' && data.accountData?.balances) {
            if (data.updateType === 'SNAPSHOT') this.replaceBalances(data.accountData.balances);
            else data.accountData.balances.forEach(this.setBalance);
        }

        if (data.event === 'ACCOUNT_UPDATE' && data.accountData?.positions) {
            if (data.updateType === 'SNAPSHOT') {
                // console.log('Income Position Snapshot:', data.accountData.positions);
                this.replacePositions(data.accountData.positions);
            } else {
                // console.log('Income Position Delta:', data.accountData.positions);
                data.accountData.positions.forEach(this.setPosition);
            }
        }

        if ((data.event === 'ORDER_TRADE_UPDATE' || data.event === 'ALGO_UPDATE') && data.orderData) {
            if (data.updateType === 'SNAPSHOT') {
                this.replaceOrders(data.orderData, data.event === 'ALGO_UPDATE');
            } else {
                data.orderData.forEach(this.setOrder);
            }
        }

        if (data.event === 'listenKeyExpired') {
            void this.init();
        }
    };

    private setBalance = (data: BalanceData): void => {
        const index = this.userData.balances.findIndex(balance => balance.asset === data.asset);
        if (index === -1) this.userData.balances.push(data);
        else this.userData.balances[index] = data;
        this.emitBalance(data.asset);
    };

    private emitBalance(asset: string): void {
        const balance = this.userData.balances.find(item => item.asset === asset);
        for (const callback of this.balanceCallbacks) callback(asset, balance);
    }

    private replaceBalances(balances: BalanceData[]): void {
        const assets = new Set([...this.userData.balances.map(item => item.asset), ...balances.map(item => item.asset)]);
        this.userData.balances = balances;
        for (const asset of assets) this.emitBalance(asset);
    }

    private setPosition = (position: PositionData): void => {
        const index = this.userData.positions.findIndex(item => item.symbol === position.symbol);
        if (index >= 0) {
            this.userData.positions[index] = position;
        } else {
            this.userData.positions.push(position);
        }
        this.emitPosition(position.symbol);
    };

    private setOrder = (order: OrderData): void => {
        if (order.orderType === "MARKET" && !order.isAlgoOrder) return

        const terminal = ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(order.orderStatus);
        const index = this.userData.orders.findIndex(item => item.clientOrderId === order.clientOrderId);

        if (terminal) {
            if (index >= 0) this.userData.orders.splice(index, 1);
        } else if (index >= 0) {
            this.userData.orders[index] = order;
        } else {
            this.userData.orders.push(order);
        }

        this.emitOrders(order.symbol);
    };

    private replacePositions(positions: PositionData[]): void {
        const previousPositions = this.userData.positions;
        const snapshotSymbols = new Set(positions.map(position => position.symbol));
        const closedPositions = previousPositions
            .filter(position => !snapshotSymbols.has(position.symbol))
            .map(position => ({ ...position, isInPosition: false }));
        const symbols = new Set([...previousPositions.map(item => item.symbol), ...snapshotSymbols]);

        this.userData.positions = [...positions, ...closedPositions];
        for (const symbol of symbols) this.emitPosition(symbol);
    }

    private replaceOrders(orders: OrderData[], isAlgoSnapshot: boolean): void {
        const previousSnapshotOrders = this.userData.orders.filter(item => item.isAlgoOrder === isAlgoSnapshot);
        const preservedOrders = this.userData.orders.filter(item => item.isAlgoOrder !== isAlgoSnapshot);
        const symbols = new Set([...previousSnapshotOrders.map(item => item.symbol), ...orders.map(item => item.symbol)]);
        this.userData.orders = [...preservedOrders, ...orders.filter(item => !this.isTerminal(item))];
        for (const symbol of symbols) this.emitOrders(symbol);
    }

    private isTerminal(order: OrderData): boolean {
        return ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(order.orderStatus);
    }

    private emitPosition(symbol: string): void {
        const position = this.userData.positions.find(item => item.symbol === symbol);
        for (const callback of this.positionCallbacks) callback(symbol, position);
    }

    private emitOrders(symbol: string): void {
        const orders = this.userData.orders.filter(item => item.symbol === symbol);
        for (const callback of this.orderCallbacks) callback(symbol, orders);
    }
}
