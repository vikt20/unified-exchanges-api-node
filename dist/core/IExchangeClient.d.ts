/**
 * IExchangeClient - Unified Exchange Client Interface
 *
 * Extracted from IBinanceClass - Binance is the reference implementation.
 * All exchanges must implement this interface.
 */
import type { FormattedResponse, StaticDepth, GetStaticDepthParams, AccountData, PositionData, PositionRiskData, ExchangeInfoData, OrderData, OrderRequestResponse, GetOpenOrdersBySymbolParams, GetAggTradesParams, AggTradesData, CancelAllOpenOrdersParams, CancelOrderByIdParams, MarketOrderParams, TrailingStopOrderParams, LimitOrderParams, StopOrderParams, StopMarketOrderParams, ReduceOrderParams, ReducePositionParams, KlineData, OrderInput } from './types.js';
/**
 * Unified Exchange Client Interface
 *
 * Defines the standard API for interacting with any exchange.
 * Method signatures match existing Binance implementation.
 *
 * Note: `getExchangeInfo()` returns `unknown` because exchange info structure
 * varies significantly between exchanges.
 */
export interface IExchangeClient {
    closeListenKey(): Promise<FormattedResponse<unknown>>;
    /** Returns unified exchange info with symbol details and filters. */
    getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>>;
    getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>>;
    getKlines(params: {
        symbol: string;
        interval: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<FormattedResponse<KlineData[]>>;
    getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: GetOpenOrdersBySymbolParams): Promise<FormattedResponse<OrderData[]>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<unknown>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<unknown>>;
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
}
//# sourceMappingURL=IExchangeClient.d.ts.map