import KrakenStreams from './KrakenStreams.js';
import { IExchangeClient } from '../core/IExchangeClient.js';
import { FormattedResponse, ExtractedInfo, GetStaticDepthParams, StaticDepth, KlineData, GetAggTradesParams, AggTradesData, GetFundingHistoryParams, FundingHistoryData, AccountData, PositionRiskData, PositionData, OrderData, GetOpenOrdersBySymbolParams, CancelAllOpenOrdersParams, CancelOrderByIdParams, OrderRequestResponse, MarketOrderParams, LimitOrderParams, StopOrderParams, StopMarketOrderParams, ReduceOrderParams, ReducePositionParams, TrailingStopOrderParams, OrderInput } from '../core/types.js';
import { KrakenCancelOrderResult } from './converters.js';
export default class KrakenSpot extends KrakenStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean);
    closeListenKey(): Promise<FormattedResponse<string>>;
    getExchangeInfo(): Promise<FormattedResponse<{
        [key: string]: ExtractedInfo;
    }>>;
    getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>>;
    getKlines(params: {
        symbol: string;
        interval: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<FormattedResponse<KlineData[]>>;
    getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>>;
    getFundingHistory(_params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(_params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    cancelAllOpenOrders(_params: CancelAllOpenOrdersParams): Promise<FormattedResponse<KrakenCancelOrderResult>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<KrakenCancelOrderResult>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(_params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(_params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(_params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(_params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    trailingStopOrder(_params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>>;
    getLatestPnlBySymbol(_symbol: string): Promise<FormattedResponse<number>>;
    private normalizeInterval;
    private mapSpotOrderType;
}
//# sourceMappingURL=KrakenSpot.d.ts.map