import { IUserDataManager, IUserDataState, BalanceUpdateCallback, OrderUpdateCallback, PositionUpdateCallback, StatusUpdateCallback, Unsubscribe } from '../core/IUserDataManager.js';
import BitgetFutures from './BitgetFutures.js';
export default class BitgetUserData extends BitgetFutures implements IUserDataManager {
    userData: IUserDataState;
    private positionCallbacks;
    private balanceCallbacks;
    private orderCallbacks;
    private statusCallbacks;
    onPositionUpdate(callback: PositionUpdateCallback): Unsubscribe;
    onBalanceUpdate(callback: BalanceUpdateCallback): Unsubscribe;
    onOrderUpdate(callback: OrderUpdateCallback): Unsubscribe;
    onStatusUpdate(callback: StatusUpdateCallback): Unsubscribe;
    triggerPositionUpdate(symbol: string): void;
    triggerOrderUpdate(symbol: string): void;
    init(): Promise<unknown>;
    destroy(): void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    requestAllBalances(): Promise<void>;
    triggerBalanceUpdate(asset: string): void;
    private handleUserStatus;
    private handleUserData;
    private setBalance;
    private emitBalance;
    private replaceBalances;
    private setPosition;
    private setOrder;
    private replacePositions;
    private replaceOrders;
    private isTerminal;
    private emitPosition;
    private emitOrders;
}
//# sourceMappingURL=BitgetUserData.d.ts.map