import BitgetStreams from './BitgetStreams.js';
import type { IExchangeClient } from '../core/IExchangeClient.js';
import type { AccountData, AggTradesData, CancelAllOpenOrdersParams, CancelOrderByIdParams, ExtractedInfo, FormattedResponse, FundingHistoryData, GetAggTradesParams, GetFundingHistoryParams, GetOpenOrdersBySymbolParams, GetStaticDepthParams, KlineData, LimitOrderParams, MarketOrderParams, OrderData, OrderInput, OrderRequestResponse, PositionData, PositionRiskData, ReduceOrderParams, ReducePositionParams, StaticDepth, StopMarketOrderParams, StopOrderParams, TrailingStopOrderParams } from '../core/types.js';
export default class BitgetSpot extends BitgetStreams implements IExchangeClient {
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
    getFundingHistory(_params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(_params: {
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
    stopOrder(_params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(_params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(_params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(_params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    trailingStopOrder(_params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    getLatestPnlBySymbol(_symbol: string): Promise<FormattedResponse<number>>;
    private createClientOid;
    private normalizeRestInterval;
}
//# sourceMappingURL=BitgetSpot.d.ts.map