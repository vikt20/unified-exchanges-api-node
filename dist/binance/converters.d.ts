import { ExchangeInfo, ExtractedInfo, AccountData, OrderData, OrderRequestResponse, PositionData, AggTradesData, AlgoOrderResponse } from './BinanceBase.js';
import { TradeData, TradeDataWebSocket, DepthData, KlineData, UserData, DepthDataWebSocket, KlineDataWebSocket, UserDataWebSocket, AccountDataWebSocket, OrderDataWebSocket, BookTickerDataWebSocket, BookTickerData, AlgoOrderDataWebSocket } from './BinanceStreams.js';
import { AggTradesDataByRequest, KlineDataByRequest, PositionDataByRequest } from './BinanceFutures.js';
export declare function convertObjectIntoUrlEncoded(obj: any): string;
export declare function extractInfo(data: ExchangeInfo['symbols']): {
    [key: string]: ExtractedInfo;
};
export declare function convertDepthData(inputData: DepthDataWebSocket): DepthData;
export declare function convertKlineData(inputData: KlineDataWebSocket): KlineData;
export declare function convertUserData(rawData: UserDataWebSocket): UserData;
export declare function convertAccountDataWebSocketRaw(rawAccountData: AccountDataWebSocket): AccountData;
export declare function convertOrderDataWebSocket(rawData: OrderDataWebSocket): OrderData;
export declare function convertAlgoOrderDataWebSocket(rawData: AlgoOrderDataWebSocket): OrderData;
export declare function convertOrderDataRequestResponse(rawData: OrderRequestResponse): OrderData;
export declare function convertPositionDataByRequest(rawPositionData: PositionDataByRequest): PositionData;
export declare function convertPositionRiskDataByRequest(rawPositionData: PositionDataByRequest): import('../core/types.js').PositionRiskData;
export declare function convertPositionRiskToPositionData(positionRisk: import('../core/types.js').PositionRiskData): PositionData;
export declare function convertBookTickerData(rawData: BookTickerDataWebSocket): BookTickerData;
export declare function convertKlinesDataByRequest(rawData: KlineDataByRequest[], symbol: string): KlineData[];
export declare function convertTradeDataWebSocket(rawData: TradeDataWebSocket): TradeData;
export declare function convertAggTradesDataByRequest(rawData: AggTradesDataByRequest[], symbol: string): AggTradesData[];
export declare function convertAlgoOrderByRequest(rawData: AlgoOrderResponse): OrderData;
//# sourceMappingURL=converters.d.ts.map