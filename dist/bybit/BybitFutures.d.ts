import BybitStreams from "./BybitStreams.js";
import { IFuturesExchangeClient } from "../core/IExchangeClient.js";
import { FormattedResponse, GetStaticDepthParams, StaticDepth, KlineData, GetAggTradesParams, AggTradesData, GetFundingHistoryParams, FundingHistoryData, AccountData, PositionRiskData, PositionData, OrderData, GetOpenOrdersBySymbolParams, CancelAllOpenOrdersParams, CancelOrderByIdParams, OrderRequestResponse, MarketOrderParams, LimitOrderParams, StopOrderParams, StopMarketOrderParams, ReduceOrderParams, ReducePositionParams, TrailingStopOrderParams, OrderInput, ExtractedInfo, SymbolLeverageData, SymbolMarginModeData, MarginMode, IWebsocketApiClient, WebsocketApiOption } from "../core/types.js";
export default class BybitFutures extends BybitStreams implements IFuturesExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean, useWebsocketApi?: WebsocketApiOption<IWebsocketApiClient>);
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
    private getTickerPrice;
}
//# sourceMappingURL=BybitFutures.d.ts.map