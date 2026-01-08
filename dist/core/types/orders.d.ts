/**
 * Order Types
 *
 * Unified order-related type definitions.
 */
import { OrderSide, OrderType, OrderStatus, TimeInForce, OrderWorkingType, PositionSide, PositionDirection } from './common.js';
export interface OrderData {
    symbol: string;
    clientOrderId: string;
    side: OrderSide;
    orderType: OrderType;
    timeInForce: TimeInForce;
    originalQuantity: number;
    originalPrice: number;
    averagePrice: number;
    stopPrice: number;
    executionType: string;
    orderStatus: OrderStatus;
    orderId: number | string;
    orderLastFilledQuantity: number;
    orderFilledAccumulatedQuantity: number;
    lastFilledPrice: number;
    commissionAsset: string;
    commission?: string;
    orderTradeTime: number;
    tradeId: number;
    bidsNotional?: string;
    askNotional?: string;
    isMakerSide: boolean;
    isReduceOnly: boolean;
    workingType: OrderWorkingType;
    originalOrderType: OrderType;
    positionSide: PositionSide;
    closeAll: boolean;
    activationPrice: string;
    callbackRate: string;
    realizedProfit: string;
    isAlgoOrder: boolean;
}
export interface OrderRequestResponse {
    orderId: number;
    symbol: string;
    status: OrderStatus;
    clientOrderId: string;
    price: string;
    avgPrice?: string;
    origQty: string;
    executedQty?: string;
    cumQuote?: string;
    timeInForce: TimeInForce;
    type: OrderType;
    reduceOnly: boolean;
    closePosition: boolean;
    side: OrderSide;
    positionSide: PositionSide;
    stopPrice?: string;
    workingType: OrderWorkingType;
    priceProtect?: boolean;
    origType: OrderType;
    priceMatch?: string;
    selfTradePreventionMode?: string;
    goodTillDate?: number;
    time?: number;
    updateTime?: number;
}
export interface OrderInput {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity?: number;
    price?: number;
    triggerPrice?: number;
    timeInForce?: TimeInForce;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;
    workingType?: OrderWorkingType;
    callbackRate?: number;
    activatePrice?: number;
    algoType?: 'CONDITIONAL';
}
export interface MarketOrderParams {
    symbol: string;
    quantity: number;
    reduceOnly?: boolean;
}
export interface LimitOrderParams {
    symbol: string;
    price: number;
    quantity: number;
}
export interface StopOrderParams {
    symbol: string;
    price: number;
    side: OrderSide;
    type: OrderType;
    workingType?: OrderWorkingType;
}
export interface StopMarketOrderParams {
    symbol: string;
    price: number;
    quantity: number;
    side: OrderSide;
}
export interface ReduceOrderParams {
    symbol: string;
    price: number;
    quantity: number;
    side: OrderSide;
    workingType?: OrderWorkingType;
}
export interface ReducePositionParams {
    symbol: string;
    positionDirection: PositionDirection;
    quantity: number;
}
export interface TrailingStopOrderParams {
    symbol: string;
    side: OrderSide;
    quantity: number;
    callbackRate: number;
    activatePrice?: number;
}
export interface CancelOrderByIdParams {
    symbol: string;
    clientOrderId: string;
    isAlgoOrder?: boolean;
}
export interface CancelAllOpenOrdersParams {
    symbol: string;
}
export interface GetOpenOrdersBySymbolParams {
    symbol: string;
}
//# sourceMappingURL=orders.d.ts.map