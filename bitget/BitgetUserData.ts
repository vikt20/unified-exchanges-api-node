import {
    IUserDataManager,
    IUserDataState,
    OrderUpdateCallback,
    PositionUpdateCallback,
    StatusUpdateCallback,
    Unsubscribe
} from '../core/IUserDataManager.js';
import type { OrderData, PositionData, SocketStatus, UserData } from '../core/types.js';
import BitgetFutures from './BitgetFutures.js';

export default class BitgetUserData extends BitgetFutures implements IUserDataManager {
    userData: IUserDataState = {
        positions: [],
        orders: []
    };

    private positionCallbacks = new Set<PositionUpdateCallback>();
    private orderCallbacks = new Set<OrderUpdateCallback>();
    private statusCallbacks = new Set<StatusUpdateCallback>();

    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe {
        this.positionCallbacks.add(callback);
        return () => this.positionCallbacks.delete(callback);
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
            this.requestAllPositions()
        ]);
    }

    destroy(): void {
        this.closeAllSockets();
        this.positionCallbacks.clear();
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

    private handleUserStatus = (status: SocketStatus): void => {
        for (const callback of this.statusCallbacks) callback(status);
    };

    private handleUserData = (data: UserData): void => {
        if (data.event === 'ACCOUNT_UPDATE' && data.accountData?.positions) {
            if (data.updateType === 'SNAPSHOT') {
                this.replacePositions(data.accountData.positions);
            } else {
                data.accountData.positions.forEach(this.setPosition);
            }
        }

        if (data.event === 'ORDER_TRADE_UPDATE' && data.orderData) {
            if (data.updateType === 'SNAPSHOT') {
                this.replaceOrders(data.orderData);
            } else {
                data.orderData.forEach(this.setOrder);
            }
        }

        if (data.event === 'listenKeyExpired') {
            void this.init();
        }
    };

    private setPosition = (position: PositionData): void => {
        const index = this.userData.positions.findIndex(item => item.symbol === position.symbol);
        if (!position.isInPosition || position.positionAmount === 0) {
            if (index >= 0) this.userData.positions.splice(index, 1);
        } else if (index >= 0) {
            this.userData.positions[index] = position;
        } else {
            this.userData.positions.push(position);
        }
        this.emitPosition(position.symbol);
    };

    private setOrder = (order: OrderData): void => {
        if (order.orderType === 'MARKET') return;

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
        const symbols = new Set([...this.userData.positions.map(item => item.symbol), ...positions.map(item => item.symbol)]);
        this.userData.positions = positions.filter(item => item.isInPosition && item.positionAmount !== 0);
        for (const symbol of symbols) this.emitPosition(symbol);
    }

    private replaceOrders(orders: OrderData[]): void {
        const symbols = new Set([...this.userData.orders.map(item => item.symbol), ...orders.map(item => item.symbol)]);
        this.userData.orders = orders.filter(item => item.orderType !== 'MARKET' && !this.isTerminal(item));
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

