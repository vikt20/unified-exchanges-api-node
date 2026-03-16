import { KlineData, OrderData, PositionData, OrderType, ExtractedInfo } from '../core/types.js';
export declare function convertExchangeInfo(data: any): {
    [key: string]: ExtractedInfo;
};
export declare function convertOkxKline(item: string[], symbol: string): KlineData;
export declare function mapOkxOrderType(ordType: string): OrderType;
export declare function convertOkxOrder(item: any): OrderData;
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