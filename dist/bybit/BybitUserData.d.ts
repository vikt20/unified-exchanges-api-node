import { IUserDataManager, IUserDataState } from "../core/IUserDataManager.js";
import BybitFutures from "./BybitFutures.js";
import { UserData } from "../binance/BinanceStreams.js";
import { PositionData, OrderData } from "../core/types.js";
import { EventEmitter } from 'events';
/**
 * BybitUserData - Implementation of IUserDataManager for Bybit
 */
export default class BybitUserData extends BybitFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string);
    static Emitter: EventEmitter;
    static POSITION_EVENT: string;
    static ORDER_EVENT: string;
    static TRIGGER_POSITION_EVENT: string;
    static TRIGGER_ORDER_EVENT: string;
    userData: IUserDataState;
    init(): Promise<unknown>;
    emitPosition: (symbol: string) => void;
    emitOrders: (symbol: string) => void;
    handleUserData: (data: UserData) => void;
    requestAllOrders(): Promise<void>;
    requestAllPositions(): Promise<void>;
    setPosition: (data: PositionData) => Promise<void>;
    setOrders: (data: OrderData) => Promise<void>;
}
//# sourceMappingURL=BybitUserData.d.ts.map