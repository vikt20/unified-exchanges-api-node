import KrakenStreams from './KrakenStreams.js';
import { IExchangeClient } from '../core/IExchangeClient.js';
import { FormattedResponse, ExtractedInfo, GetStaticDepthParams, StaticDepth, KlineData, GetAggTradesParams, AggTradesData, GetFundingHistoryParams, FundingHistoryData, AccountData, PositionRiskData, PositionData, OrderData, GetOpenOrdersBySymbolParams, CancelAllOpenOrdersParams, CancelOrderByIdParams, OrderRequestResponse, MarketOrderParams, LimitOrderParams, StopOrderParams, StopMarketOrderParams, ReduceOrderParams, ReducePositionParams, TrailingStopOrderParams, OrderInput } from '../core/types.js';
export default class KrakenFutures extends KrakenStreams implements IExchangeClient {
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
    getFundingHistory(params: GetFundingHistoryParams): Promise<FormattedResponse<FundingHistoryData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<{
        result?: string;
        error?: string;
    }>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<{
        result?: string;
        error?: string;
    }>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    customOrder(orderInput: OrderInput): Promise<FormattedResponse<OrderRequestResponse>>;
    getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>>;
    private convertCashBalancesToUsdt;
    private valueCashBalanceInUsd;
    private getSpotLastPrice;
    private normalizeCashCurrency;
    private normalizeResolution;
    private mapFuturesOrderType;
}
//# sourceMappingURL=KrakenFutures.d.ts.map