import BitgetStreams from './BitgetStreams.js';
import type { IFuturesExchangeClient } from '../core/IExchangeClient.js';
import type { AccountData, AggTradesData, CancelAllOpenOrdersParams, CancelOrderByIdParams, ExtractedInfo, FormattedResponse, FundingHistoryData, GetAggTradesParams, GetFundingHistoryParams, GetOpenOrdersBySymbolParams, GetStaticDepthParams, KlineData, LimitOrderParams, MarketOrderParams, OrderData, OrderInput, OrderRequestResponse, PositionData, PositionRiskData, ReduceOrderParams, ReducePositionParams, StaticDepth, StopMarketOrderParams, StopOrderParams, TrailingStopOrderParams, SymbolLeverageData, SymbolMarginModeData, MarginMode } from '../core/types.js';
export default class BitgetFutures extends BitgetStreams implements IFuturesExchangeClient {
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
    getSymbolLeverage({ symbol }: {
        symbol: string;
    }): Promise<FormattedResponse<SymbolLeverageData>>;
    updateSymbolLeverage({ symbol, leverage }: {
        symbol: string;
        leverage: number;
    }): Promise<FormattedResponse<SymbolLeverageData>>;
    getSymbolMarginMode({ symbol }: {
        symbol: string;
    }): Promise<FormattedResponse<SymbolMarginModeData>>;
    updateSymbolMarginMode({ symbol, marginMode }: {
        symbol: string;
        marginMode: MarginMode;
    }): Promise<FormattedResponse<SymbolMarginModeData>>;
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
    getLatestPnlBySymbol(symbol: string, startTime?: number, endTime?: number): Promise<FormattedResponse<number>>;
    private extractOrders;
    private createClientOid;
    private normalizeRestInterval;
}
//# sourceMappingURL=BitgetFutures.d.ts.map