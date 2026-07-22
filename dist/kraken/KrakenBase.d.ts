import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import { FormattedResponse } from '../core/types.js';
import { KrakenSpotResponse, KrakenFuturesBaseResponse } from './converters.js';
export type KrakenMarketType = 'spot' | 'futures' | 'futures-charts';
type KrakenParamValue = string | number | boolean;
type KrakenRequestParams = Record<string, KrakenParamValue | undefined>;
export default class KrakenBase extends AbstractExchangeBase {
    readonly exchange_id = "KRAKEN";
    static SPOT_BASE_URL: string;
    static FUTURES_BASE_URL: string;
    static FUTURES_CHARTS_BASE_URL: string;
    static SPOT_WS_URL: string;
    static FUTURES_WS_URL: string;
    static FUTURES_TESTNET_WS_URL: string;
    static FUTURES_TESTNET_BASE_URL: string;
    static FUTURES_TESTNET_CHARTS_BASE_URL: string;
    private lastNonce;
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean);
    protected getBaseUrl(marketType: KrakenMarketType): string;
    getStreamUrl(marketType: 'spot' | 'futures'): string;
    setTimeOffset(): Promise<void>;
    getServerTime(): Promise<number>;
    protected generateSignature(_queryString: string): string;
    protected getNonce(): number;
    protected buildSpotSignature(urlPath: string, params: KrakenRequestParams): string;
    protected buildFuturesSignature(endpointPath: string, params: KrakenRequestParams, nonce: number): string;
    protected formatSpotResponse<T>(data?: KrakenSpotResponse<T>, errors?: string): FormattedResponse<T>;
    protected formatFuturesResponse<T>(data?: KrakenFuturesBaseResponse & T, errors?: string): FormattedResponse<T>;
    publicRequest<T>(marketType: KrakenMarketType, method: 'GET' | 'POST', endpoint: string, params?: KrakenRequestParams): Promise<FormattedResponse<T>>;
    signedRequest<T>(marketType: KrakenMarketType, method: 'POST' | 'GET', endpoint: string, params?: KrakenRequestParams): Promise<FormattedResponse<T>>;
}
export {};
//# sourceMappingURL=KrakenBase.d.ts.map