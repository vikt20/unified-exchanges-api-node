import OkxStreams from "./OkxStreams.js";
import { IExchangeClient } from "../core/IExchangeClient.js";
import { FormattedResponse, GetStaticDepthParams, StaticDepth, KlineData, GetAggTradesParams, AggTradesData, GetFundingHistoryParams, FundingHistoryData, AccountData, PositionRiskData, PositionData, OrderData, GetOpenOrdersBySymbolParams, CancelAllOpenOrdersParams, CancelOrderByIdParams, OrderRequestResponse, MarketOrderParams, LimitOrderParams, StopOrderParams, StopMarketOrderParams, ReduceOrderParams, ReducePositionParams, TrailingStopOrderParams, OrderInput, ExtractedInfo } from "../core/types.js";
export default class OkxSpot extends OkxStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest?: boolean);
    closeListenKey(): Promise<FormattedResponse<unknown>>;
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
    getFundingHistory(params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(symbol?: string): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>>;
    customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>>;
}
//# sourceMappingURL=OkxSpot.d.ts.map