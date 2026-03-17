import { KlineData, OrderData, PositionData, OrderType, ExtractedInfo } from '../core/types.js';
export declare function convertExchangeInfo(data: any): {
    [key: string]: ExtractedInfo;
};
export declare function convertOkxKline(item: string[], symbol: string): KlineData;
export type OkxOrdType = 'market' | 'limit' | 'conditional' | 'trigger' | 'move_order_stop' | 'oco' | 'post_only' | 'foc' | 'ioc' | 'optimal_limit_ioc';
export type OkxSide = 'buy' | 'sell';
export type OkxTriggerPxType = 'last' | 'mark' | 'index';
export interface OkxOrderItem {
    instId: string;
    ordId: string;
    algoId: string;
    clOrdId: string;
    algoClOrdId: string;
    ordType: OkxOrdType;
    side: OkxSide;
    state: string;
    actualOrder: string;
    posSide: 'long' | 'short' | 'net';
    sz: string;
    px: string;
    avgPx: string;
    triggerPx?: string;
    orderPx?: string;
    slTriggerPx?: string;
    tpTriggerPx?: string;
    slOrdPx?: string;
    tpOrdPx?: string;
    triggerPxType?: OkxTriggerPxType;
    slTriggerPxType?: OkxTriggerPxType;
    tpTriggerPxType?: OkxTriggerPxType;
    fillSz?: string;
    accFillSz?: string;
    fillPx?: string;
    feeCcy?: string;
    fee?: string;
    uTime?: string;
    cTime?: string;
    execType?: string;
    reduceOnly?: boolean | 'true' | 'false';
    closeFraction?: string;
    pnl?: string;
}
export declare function mapOkxOrderType(item: OkxOrderItem): OrderType;
export declare function convertOkxOrder(item: OkxOrderItem): OrderData;
export declare function convertOkxPosition(item: any): PositionData;
export interface OkxWsMessage {
    arg?: {
        channel: string;
        instId?: string;
        instType?: string;
    };
    action?: string;
    data?: any[];
    event?: string;
    code?: string;
    msg?: string;
}
export interface OkxDepthWsData {
    bids: [string, string, string, string][];
    asks: [string, string, string, string][];
    ts: string;
    checksum: number;
}
//# sourceMappingURL=converters.d.ts.map