import { IUserDataManager } from "../core/IUserDataManager.js";
import { OrderData, PositionData } from "./BinanceBase.js";
import BinanceFutures from "./BinanceFutures.js";
import { UserData as WebSocketUserData } from "./BinanceStreams.js";
import { EventEmitter } from 'events';

export type CustomUserData = {
    positions: PositionData[],
    orders: OrderData[]
}

export default class BinanceUserData extends BinanceFutures implements IUserDataManager {
    constructor(apiKey: string, apiSecret: string) {
        super(apiKey, apiSecret)
    }

    public static Emitter: EventEmitter = new EventEmitter();
    public static POSITION_EVENT = 'position';
    public static ORDER_EVENT = 'order';
    public static TRIGGER_POSITION_EVENT = 'triggerPosition';
    public static TRIGGER_ORDER_EVENT = 'triggerOrder';

    userData: CustomUserData = {
        positions: [],
        orders: []
    }

    async init() {
        BinanceUserData.Emitter.on(BinanceUserData.TRIGGER_POSITION_EVENT, this.emitPosition)
        BinanceUserData.Emitter.on(BinanceUserData.TRIGGER_ORDER_EVENT, this.emitOrders)

        return Promise.all([
            this.futuresUserDataStream(this.handleUserData),
            this.requestAllOrders(),
            this.requestAllPositions()
        ])
    }

    emitPosition = (symbol: string) => {
        BinanceUserData.Emitter.emit(BinanceUserData.POSITION_EVENT, symbol, this.userData.positions.find(p => p.symbol === symbol))
    }
    emitOrders = (symbol: string) => {
        BinanceUserData.Emitter.emit(BinanceUserData.ORDER_EVENT, symbol, this.userData.orders.filter(order => order.symbol === symbol))
    }

    handleUserData = (data: WebSocketUserData) => {

        switch (data.event) {
            case "ACCOUNT_UPDATE":
                if (data.accountData) data.accountData.positions.forEach(this.setPosition)
                break;
            case "ORDER_TRADE_UPDATE":
                // console.log(data.orderData)
                if (data.orderData) this.setOrders(data.orderData);
                break;
            case "listenKeyExpired":
                throw new Error("listenKeyExpired");
                break;
            default:
                // console.log(`No event found: `, data)
                break;
        }
        // console.log(userData);
    }

    async requestAllOrders(): Promise<void> {
        const request = await this.getOpenOrders();

        if (!request.success || !request.data) {
            throw new Error(`getOpenOrders() - ${request.errors}`)
        }

        this.userData.orders = request.data
    }

    async requestAllPositions() {
        const request = await this.getOpenPositions();

        if (!request.success || !request.data) {
            throw new Error(`getOpenPositions() - ${request.errors}`)
        }

        this.userData.positions = request.data
    }

    setOrders = async (data: OrderData): Promise<void> => {
        const symbol = data.symbol;
        // console.log(data);

        if (data.orderType === "MARKET") return

        switch (data.orderStatus) {
            case "CANCELED":
            case "FILLED":
            case "REJECTED":
            case "EXPIRED":
            case "FINISHED":
                // case "TRIGGERED":
                this.userData.orders = this.userData.orders.filter(order => order.clientOrderId !== data.clientOrderId);
                break;
            case "NEW":
                this.userData.orders.push(data);
                break;
            default:
                return;
        }
        //Emit event to listeners
        this.emitOrders(symbol)
    }

    setPosition = async (data: PositionData): Promise<void> => {
        const symbol = data.symbol;

        const position = this.userData.positions.find(p => p.symbol === symbol);

        if (typeof position === 'undefined') {
            this.userData.positions.push(data);
        } else {
            this.userData.positions = this.userData.positions.map(p => {
                if (p.symbol === symbol) {
                    return data
                }
                return p
            })
        }
        //Emit event to listeners
        this.emitPosition(symbol)
    }


}