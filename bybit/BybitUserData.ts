
import { IUserDataManager, IUserDataState } from "../core/IUserDataManager.js";
import BybitFutures from "./BybitFutures.js";
import { UserData } from "../binance/BinanceStreams.js";
import { PositionData, OrderData } from "../core/types.js";
import { EventEmitter } from 'events';

/**
 * BybitUserData - Implementation of IUserDataManager for Bybit
 */
export default class BybitUserData extends BybitFutures implements IUserDataManager {

    constructor(apiKey: string, apiSecret: string) {
        super(apiKey, apiSecret);
    }

    public static Emitter: EventEmitter = new EventEmitter();

    // Outbound Events
    public static POSITION_EVENT = 'position';
    public static ORDER_EVENT = 'order';

    // Inbound Events
    public static TRIGGER_POSITION_EVENT = 'triggerPosition';
    public static TRIGGER_ORDER_EVENT = 'triggerOrder';

    userData: IUserDataState = {
        positions: [],
        orders: []
    }

    async init(): Promise<unknown> {
        // Setup Event Listeners
        BybitUserData.Emitter.on(BybitUserData.TRIGGER_POSITION_EVENT, this.emitPosition);
        BybitUserData.Emitter.on(BybitUserData.TRIGGER_ORDER_EVENT, this.emitOrders);

        // Connect Stream and fetch Snapshots
        return Promise.all([
            this.futuresUserDataStream(this.handleUserData),
            this.requestAllOrders(),
            this.requestAllPositions()
        ]);
    }

    emitPosition = (symbol: string) => {
        const pos = this.userData.positions.find(p => p.symbol === symbol);
        BybitUserData.Emitter.emit(BybitUserData.POSITION_EVENT, symbol, pos);
    }

    emitOrders = (symbol: string) => {
        const orders = this.userData.orders.filter(o => o.symbol === symbol);
        BybitUserData.Emitter.emit(BybitUserData.ORDER_EVENT, symbol, orders);
    }

    handleUserData = (data: UserData) => {
        // handle incoming ws events
        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData && data.accountData.positions) {
                    data.accountData.positions.forEach(this.setPosition);
                }
                break;
            case "ORDER_TRADE_UPDATE":
                if (data.orderData) {
                    this.setOrders(data.orderData);
                }
                break;
            default:
                // console.log("Bybit Unhandled User Event", data.event);
                break;
        }
    }

    async requestAllOrders(): Promise<void> {
        // Fetch snapshot
        const res = await this.getOpenOrders(); // defined in BybitFutures
        if (res.success && res.data) {
            this.userData.orders = res.data;
        } else {
            console.error("BybitUserData: Failed to fetch open orders", res.errors);
        }
    }

    async requestAllPositions(): Promise<void> {
        const res = await this.getOpenPositions(); // defined in BybitFutures
        if (res.success && res.data) {
            this.userData.positions = res.data;
        } else {
            console.error("BybitUserData: Failed to fetch open positions", res.errors);
        }
    }

    setPosition = async (data: PositionData): Promise<void> => {
        const symbol = data.symbol;
        const idx = this.userData.positions.findIndex(p => p.symbol === symbol && p.positionDirection === data.positionDirection);
        // Note: Bybit allows Hedge mode (Two positions per symbol).
        // Identifier should be Symbol + Direction.

        if (idx === -1) {
            this.userData.positions.push(data);
        } else {
            this.userData.positions[idx] = data;
        }

        // Emit update
        this.emitPosition(symbol);
    }

    setOrders = async (data: OrderData): Promise<void> => {
        const symbol = data.symbol;

        // Logic similar to BinanceUserData
        if (data.orderType === 'MARKET') return; // usually don't track market orders in open orders list

        const status = data.orderStatus;
        if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) {
            // Remove
            this.userData.orders = this.userData.orders.filter(o => o.clientOrderId !== data.clientOrderId);
        } else if (status === 'NEW' || status === 'PARTIALLY_FILLED') {
            // Add or Update
            const idx = this.userData.orders.findIndex(o => o.clientOrderId === data.clientOrderId);
            if (idx === -1) {
                this.userData.orders.push(data);
            } else {
                this.userData.orders[idx] = data;
            }
        }

        this.emitOrders(symbol);
    }
}
