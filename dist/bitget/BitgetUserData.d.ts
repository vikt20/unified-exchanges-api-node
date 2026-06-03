import { IUserDataManager, IUserDataState, OrderUpdateCallback, PositionUpdateCallback, StatusUpdateCallback, Unsubscribe } from '../core/IUserDataManager.js';
import BitgetFutures from './BitgetFutures.js';
export default class BitgetUserData extends BitgetFutures implements IUserDataManager {
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
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    private handleUserStatus;
    private handleUserData;
    private setPosition;
    private setOrder;
    private replacePositions;
    private replaceOrders;
    private isTerminal;
    private emitPosition;
    private emitOrders;
}
//# sourceMappingURL=BitgetUserData.d.ts.map