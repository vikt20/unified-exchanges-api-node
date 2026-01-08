import { FormattedResponse, GetStaticDepthParams, StaticDepth, AccountData, OrderData, OrderRequestResponse, OrderSide, OrderType, TimeInForce, CancelAllOpenOrdersParams, CancelOrderByIdParams, MarketOrderParams, TrailingStopOrderParams, LimitOrderParams, PositionData, StopOrderParams, ReduceOrderParams, ReducePositionParams, StopMarketOrderParams, GetAggTradesParams, AggTradesData } from "./BinanceBase.js";
import BinanceStreams, { KlineData } from "./BinanceStreams.js";
import { IExchangeClient } from '../core/IExchangeClient.js';
import type { ExchangeInfoData, PositionRiskData } from '../core/types.js';
export default class BinanceSpot extends BinanceStreams implements IExchangeClient {
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean);
    closeListenKey(): Promise<FormattedResponse<any>>;
    getStaticDepth(params: GetStaticDepthParams): Promise<FormattedResponse<StaticDepth>>;
    getKlines(params: {
        symbol: string;
        interval: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<FormattedResponse<KlineData[]>>;
    getExchangeInfo(): Promise<FormattedResponse<ExchangeInfoData>>;
    getBalance(): Promise<FormattedResponse<AccountData['balances']>>;
    getPositionRisk(): Promise<FormattedResponse<PositionRiskData[]>>;
    getOpenPositions(): Promise<FormattedResponse<AccountData['positions']>>;
    getOpenPositionBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<PositionData>>;
    getOpenOrders(): Promise<FormattedResponse<OrderData[]>>;
    getOpenOrdersBySymbol(params: {
        symbol: string;
    }): Promise<FormattedResponse<OrderData[]>>;
    cancelAllOpenOrders(params: CancelAllOpenOrdersParams): Promise<FormattedResponse<any>>;
    cancelOrderById(params: CancelOrderByIdParams): Promise<FormattedResponse<any>>;
    trailingStopOrder(params: TrailingStopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketBuy(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    marketSell(params: MarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitBuy(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    limitSell(params: LimitOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopOrder(params: StopOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reduceLimitOrder(params: ReduceOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    stopMarketOrder(params: StopMarketOrderParams): Promise<FormattedResponse<OrderRequestResponse>>;
    reducePosition(params: ReducePositionParams): Promise<FormattedResponse<OrderRequestResponse>>;
    customOrder(orderInput: {
        symbol: string;
        side: OrderSide;
        type: OrderType;
        quantity?: number;
        price?: number;
        timeInForce?: TimeInForce;
    }): Promise<FormattedResponse<OrderRequestResponse>>;
    getAggTrades(params: GetAggTradesParams): Promise<FormattedResponse<AggTradesData[]>>;
    getLatestPnlBySymbol(symbol: string): Promise<FormattedResponse<number>>;
}
//# sourceMappingURL=BinanceSpot.d.ts.map