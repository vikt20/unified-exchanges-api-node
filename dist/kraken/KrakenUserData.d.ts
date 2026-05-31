import { IUserDataManager, IUserDataState, PositionUpdateCallback, OrderUpdateCallback, StatusUpdateCallback, Unsubscribe } from '../core/IUserDataManager.js';
import KrakenFutures from './KrakenFutures.js';
import { PositionData, OrderData, SocketStatus, UserData } from '../core/types.js';
/**
 * KrakenUserData - Implementation of IUserDataManager for Kraken Futures.
 *
 * Maintains local open positions and open orders from an initial REST snapshot
 * and Kraken Futures authenticated WebSocket updates.
 */
export default class KrakenUserData extends KrakenFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string, isTest?: boolean);
    userData: IUserDataState;
    private positionCallbacks;
    private orderCallbacks;
    private statusCallbacks;
    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe;
    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe;
    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe;
    triggerPositionUpdate(symbol: string): void;
    triggerOrderUpdate(symbol: string): void;
    init(): Promise<unknown>;
    destroy(): void;
    handleUserData: (data: UserData) => void;
    handleUserStatus: (status: SocketStatus) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
    private replacePositionsSnapshot;
    private replaceOrdersSnapshot;
    private isTerminalOrder;
    private emitPosition;
    private emitOrders;
}
//# sourceMappingURL=KrakenUserData.d.ts.map