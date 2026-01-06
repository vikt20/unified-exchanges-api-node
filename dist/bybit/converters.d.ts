import { KlineData, OrderData, PositionData, ExchangeInfoData } from '../core/types.js';
export declare function convertExchangeInfo(data: any): ExchangeInfoData;
export interface BybitParams {
    category: 'spot' | 'linear' | 'inverse' | 'option';
    [key: string]: any;
}
export declare function convertObjectIntoUrlEncoded(obj: any): string;
export interface BybitWsMessage {
    topic?: string;
    op?: string;
    type?: 'snapshot' | 'delta';
    ts?: number;
    data?: any;
    success?: boolean;
    ret_msg?: string;
    conn_id?: string;
    req_id?: string;
}
export declare function convertBybitKline(item: string[], symbol: string): KlineData;
export declare function convertBybitOrder(item: any): OrderData;
export declare function convertBybitPosition(item: any): PositionData;
//# sourceMappingURL=converters.d.ts.map