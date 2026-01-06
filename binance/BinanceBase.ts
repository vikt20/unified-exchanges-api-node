
import http from 'http';
import https from 'https';
import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { convertObjectIntoUrlEncoded } from './converters.js';

// ━━ Import Unified Types from Core ━━
export {
    FormattedResponse,
    MarketType,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    OrderWorkingType,
    PositionDirection,
    PositionSide,
    OrderData,
    OrderInput,
    OrderRequestResponse,
    AccountData,
    PositionData,
    BalanceData,
    StaticDepth,
    AggTradesData,
    KlineData,
    DepthData,
    BookTickerData,
    TradeData,
    MarketOrderParams,
    LimitOrderParams,
    StopOrderParams,
    StopMarketOrderParams,
    ReduceOrderParams,
    ReducePositionParams,
    TrailingStopOrderParams,
    CancelOrderByIdParams,
    CancelAllOpenOrdersParams,
    GetOpenOrdersBySymbolParams,
    GetStaticDepthParams,
    GetAggTradesParams,
} from '../core/types.js';

import type {
    FormattedResponse,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    OrderWorkingType,
    PositionSide
} from '../core/types.js';
import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';

// ━━ Binance-Specific Types (Not Unified) ━━
export type Type = 'futures' | 'spot';

export type ListenKey = {
    listenKey: string;
};

export type ExchangeInfo = {
    symbols: Array<{
        symbol: string;
        status: string;
        baseAsset: string;
        baseAssetPrecision: number;
        quoteAsset: string;
        quotePrecision: number;
        quoteAssetPrecision: number;
        baseCommissionPrecision: number;
        quoteCommissionPrecision: number;
        orderTypes: Array<'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'>;
        icebergAllowed: boolean;
        ocoAllowed: boolean;
        quoteOrderQtyMarketAllowed: boolean;
        isSpotTradingAllowed: boolean;
        isMarginTradingAllowed: boolean;
        filters: Array<{
            filterType: string;
            minPrice: string;
            maxPrice: string;
            tickSize: string;
            multiplierUp: string;
            multiplierDown: string;
            minQty: string;
            maxQty: string;
            stepSize: string;
            minNotional?: string;
            notional: number;
            applyToMarket: boolean;
            avgPriceMins: number;
            limit: number;
            maxNumAlgoOrders: number;
        }>;
    }>;
};

export type ExtractedInfo = {
    status: string;
    minPrice: number;
    maxPrice: number;
    tickSize: number;
    stepSize: number;
    minQty: number;
    maxQty: number;
    minNotional: number;
    orderTypes: Array<'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'>;
    icebergAllowed: boolean;
    baseAsset: string;
    quoteAsset: string;
};



export type AlgoOrderResponse = {
    algoId: number;
    clientAlgoId: string;
    algoType: 'CONDITIONAL';
    orderType: OrderType;
    symbol: string;
    side: OrderSide;
    positionSide: PositionSide;
    timeInForce: TimeInForce;
    quantity: string;
    algoStatus: OrderStatus;
    actualOrderId: string;
    actualPrice: string;
    triggerPrice: string;
    price: string;
    icebergQuantity: string;
    tpTriggerPrice: string;
    tpPrice: string;
    slTriggerPrice: string;
    slPrice: string;
    tpOrderType: string;
    selfTradePreventionMode: string;
    workingType: OrderWorkingType;
    priceMatch: string;
    closePosition: boolean;
    priceProtect: boolean;
    reduceOnly: boolean;
    createTime: number;
    updateTime: number;
    triggerTime: number;
    goodTillDate: number;
};


export default class BinanceBase extends AbstractExchangeBase {
    public static FUTURES_STREAM_URL: string = 'wss://fstream.binance.com/ws/';
    public static SPOT_STREAM_URL: string = 'wss://stream.binance.com:9443/ws/';
    public static FUTURES_STREAM_URL_COMBINED: string = 'wss://fstream.binance.com/stream?streams=';
    public static SPOT_STREAM_URL_COMBINED: string = 'wss://stream.binance.com:9443/stream?streams=';
    public static FUTURES_BASE_URL: string = 'https://fapi.binance.com';
    public static SPOT_BASE_URL: string = 'https://api.binance.com';

    public static FUTURES_STREAM_URL_TESTNET: string = 'wss://stream.binancefuture.com/ws/';
    public static SPOT_STREAM_URL_TESTNET: string = 'wss://stream.testnet.binance.vision/ws/';
    public static FUTURES_STREAM_URL_COMBINED_TESTNET: string = 'wss://stream.binancefuture.com/stream?streams=';
    public static SPOT_STREAM_URL_COMBINED_TESTNET: string = 'wss://stream.testnet.binance.vision/stream?streams=';
    public static FUTURES_BASE_URL_TESTNET: string = 'https://testnet.binancefuture.com';
    public static SPOT_BASE_URL_TESTNET: string = 'https://testnet.binance.vision';

    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false, pingServer: boolean = false) {
        super(apiKey, apiSecret, isTest);
        if (pingServer) this.doPingServer();
        this.setTimeOffset()
    }

    private doPingServer(): void {
        const baseUrl = this.isTest ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.FUTURES_BASE_URL;
        if (this.pingServerInterval) {
            clearInterval(this.pingServerInterval);
        }
        this.pingServerInterval = setInterval(() => this._AXIOS_INSTANCE.get(`${baseUrl}/fapi/v1/ping`).catch(() => { }), 30000)
    }

    // ━━ Abstract Method Implementations ━━
    protected getBaseUrl(marketType: string): string {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.SPOT_BASE_URL_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL : BinanceBase.SPOT_BASE_URL;
    }

    public getStreamUrl(marketType: string): string {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_TESTNET : BinanceBase.SPOT_STREAM_URL_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL : BinanceBase.SPOT_STREAM_URL;
    }

    public getCombinedStreamUrl(marketType: string): string {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_COMBINED_TESTNET : BinanceBase.SPOT_STREAM_URL_COMBINED_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_COMBINED : BinanceBase.SPOT_STREAM_URL_COMBINED;
    }

    protected generateSignature(queryString: string): string {
        return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    }

    async getFuturesListenKey(): Promise<FormattedResponse<ListenKey>> {
        return await this.signedRequest('futures', 'POST', '/fapi/v1/listenKey');
    }

    async keepAliveListenKey(type: Type) {
        return type === 'futures' ? await this.signedRequest(type, 'PUT', '/fapi/v1/listenKey') : await this.signedRequest(type, 'PUT', '/api/v3/userDataStream')
    }

    async setTimeOffset(): Promise<void> {
        try {
            const serverTime: number = await this.getServerTime();
            const localTime: number = Date.now();
            this.timeOffset = localTime - serverTime;
        } catch (error) {
            throw new Error(`Failed to set time offset`);
        }
    }

    async getServerTime(): Promise<number> {
        try {
            const baseUrl = this.isTest ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.FUTURES_BASE_URL;
            const response: AxiosResponse<any> = await this._AXIOS_INSTANCE.get(`${baseUrl}/fapi/v1/time`);
            return response.data!.serverTime;
        } catch (error) {
            throw new Error(`Failed to retrieve server time`);
        }
    }


    public async publicRequest(type: Type, method: string, endpoint: string, params: any = {}): Promise<FormattedResponse<any>> {
        try {
            const _URL = this.getBaseUrl(type);
            const response: AxiosResponse<any> = await this._AXIOS_INSTANCE.request({
                method: method,
                url: `${_URL}${endpoint}`,
                params: params
            });

            return this.formattedResponse({ data: response.data })
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.msg) {
                return this.formattedResponse({ errors: error.response.data.msg })
            } else {
                return this.formattedResponse({ errors: `Failed to make request: ${error.message}` })
            }
        }
    }

    protected async signedRequest(type: Type, method: 'POST' | 'GET' | 'DELETE' | 'PUT', endpoint: string, params: any = {}): Promise<FormattedResponse<any>> {
        try {
            // const timestamp = Date.now();
            const timestamp = Date.now() - this.timeOffset;
            params.timestamp = timestamp;
            const queryString = convertObjectIntoUrlEncoded(params);
            const signature = this.generateSignature(queryString);
            // console.log(`query:`, queryString);
            const _URL = this.getBaseUrl(type);
            const response: AxiosResponse<any> = await this._AXIOS_INSTANCE.request({
                method: method,
                url: `${_URL}${endpoint}`,
                params: {
                    ...params,
                    timestamp: timestamp,
                    signature: signature
                },
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'User-Agent': 'Mozilla/4.0 (compatible; Node Binance API)',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'timeout': 5000,
                }
            });

            return this.formattedResponse({ data: response.data })
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.msg) {
                return this.formattedResponse({ errors: error.response.data.msg })
            } else {
                return this.formattedResponse({ errors: `Failed to make request: ${error.message}` })
            }
        }
    }


    formattedResponse(object: { data?: any, errors?: string }): FormattedResponse<any> {
        return {
            success: object.errors === undefined ? true : false,
            data: object.data,
            errors: object.errors
        }
    }

}