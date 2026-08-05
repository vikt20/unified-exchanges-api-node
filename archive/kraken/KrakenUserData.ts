import { IUserDataManager, IUserDataState, BalanceUpdateCallback, PositionUpdateCallback, OrderUpdateCallback, StatusUpdateCallback, Unsubscribe } from '../core/IUserDataManager.js';
import KrakenFutures from './KrakenFutures.js';
import { BalanceData, PositionData, OrderData, SocketStatus, UserData } from '../core/types.js';

/**
 * KrakenUserData - Implementation of IUserDataManager for Kraken Futures.
 *
 * Maintains local open positions and open orders from an initial REST snapshot
 * and Kraken Futures authenticated WebSocket updates.
 */
export default class KrakenUserData extends KrakenFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

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
        return () => {
            this.positionCallbacks.delete(callback);
        };
    }

    onBalanceUpdate(callback: BalanceUpdateCallback): Unsubscribe {
        this.balanceCallbacks.add(callback);
        return () => this.balanceCallbacks.delete(callback);
    }

    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe {
        this.orderCallbacks.add(callback);
        return () => {
            this.orderCallbacks.delete(callback);
        };
    }

    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe {
        this.statusCallbacks.add(callback);
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    triggerPositionUpdate(symbol: string): void {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    }

    triggerOrderUpdate(symbol: string): void {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
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

    handleUserData = (data: UserData): void => {
        switch (data.event) {
            case 'ACCOUNT_UPDATE':
                if (data.accountData?.balances !== undefined) {
                    if (data.updateType === 'SNAPSHOT') this.replaceBalances(data.accountData.balances);
                    else data.accountData.balances.forEach(this.setBalance);
                }
                if (data.accountData?.positions !== undefined) {
                    if (data.updateType === 'SNAPSHOT') {
                        this.replacePositionsSnapshot(data.accountData.positions);
                    } else {
                        data.accountData.positions.forEach(this.setPosition);
                    }
                }
                break;
            case 'ORDER_TRADE_UPDATE':
                if (data.orderData !== undefined) {
                    if (data.updateType === 'SNAPSHOT') {
                        this.replaceOrdersSnapshot(data.orderData);
                    } else {
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

    handleUserStatus = (status: SocketStatus): void => {
        for (const cb of this.statusCallbacks) {
            cb(status);
        }
    };

    async requestAllOrders(): Promise<void> {
        const res = await this.getOpenOrders();
        if (res.success && res.data) {
            this.userData.orders = res.data;
        } else {
            console.error('KrakenUserData: Failed to fetch open orders', res.errors);
        }
    }

    async requestAllPositions(): Promise<void> {
        const res = await this.getOpenPositions();
        if (res.success && res.data) {
            this.userData.positions = res.data;
        } else {
            console.error('KrakenUserData: Failed to fetch open positions', res.errors);
        }
    }

    async requestAllBalances(): Promise<void> {
        const res = await this.getBalance();
        if (res.success && res.data) this.userData.balances = res.data;
        else console.error('KrakenUserData: Failed to fetch balances', res.errors);
    }

    triggerBalanceUpdate(asset: string): void { this.emitBalance(asset); }

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

    setPosition = async (data: PositionData): Promise<void> => {
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
        } else {
            this.userData.positions[index] = data;
        }

        this.emitPosition(symbol);
    };

    setOrders = async (data: OrderData): Promise<void> => {
        const symbol = data.symbol;

        if (data.orderType === 'MARKET') return;

        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(data.orderStatus)) {
            this.userData.orders = this.userData.orders.filter(o => o.clientOrderId !== data.clientOrderId);
        } else if (['NEW', 'PARTIALLY_FILLED', 'PENDING'].includes(data.orderStatus)) {
            const index = this.userData.orders.findIndex(o => o.clientOrderId === data.clientOrderId);
            if (index === -1) {
                this.userData.orders.push(data);
            } else {
                this.userData.orders[index] = data;
            }
        } else {
            return;
        }

        this.emitOrders(symbol);
    };

    private replacePositionsSnapshot(positions: PositionData[]): void {
        const previousSymbols = new Set(this.userData.positions.map(position => position.symbol));
        const activePositions = positions.filter(position => position.isInPosition && position.positionAmount !== 0);
        const nextSymbols = new Set(activePositions.map(position => position.symbol));

        this.userData.positions = activePositions;

        for (const symbol of new Set([...previousSymbols, ...nextSymbols])) {
            this.emitPosition(symbol);
        }
    }

    private replaceOrdersSnapshot(orders: OrderData[]): void {
        const previousSymbols = new Set(this.userData.orders.map(order => order.symbol));
        const activeOrders = orders.filter(order => order.orderType !== 'MARKET' && !this.isTerminalOrder(order));
        const nextSymbols = new Set(activeOrders.map(order => order.symbol));

        this.userData.orders = activeOrders;

        for (const symbol of new Set([...previousSymbols, ...nextSymbols])) {
            this.emitOrders(symbol);
        }
    }

    private isTerminalOrder(data: OrderData): boolean {
        return ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'FINISHED'].includes(data.orderStatus);
    }

    private emitPosition = (symbol: string): void => {
        const position = this.userData.positions.find(p => p.symbol === symbol);
        for (const cb of this.positionCallbacks) {
            cb(symbol, position);
        }
    };

    private emitOrders = (symbol: string): void => {
        const orders = this.userData.orders.filter(order => order.symbol === symbol);
        for (const cb of this.orderCallbacks) {
            cb(symbol, orders);
        }
    };
}
