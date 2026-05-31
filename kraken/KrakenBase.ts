import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { FormattedResponse } from '../core/types.js';
import { KrakenSpotResponse, KrakenFuturesBaseResponse } from './converters.js';

export type KrakenMarketType = 'spot' | 'futures' | 'futures-charts';

type KrakenParamValue = string | number | boolean;

type KrakenRequestParams = Record<string, KrakenParamValue | undefined>;

export default class KrakenBase extends AbstractExchangeBase {
    public static SPOT_BASE_URL = 'https://api.kraken.com';
    public static FUTURES_BASE_URL = 'https://futures.kraken.com/derivatives/api/v3';
    public static FUTURES_CHARTS_BASE_URL = 'https://futures.kraken.com/api/charts/v1';


    public static SPOT_WS_URL = 'wss://ws.kraken.com/v2';
    public static FUTURES_WS_URL = 'wss://futures.kraken.com/ws/v1';

    public static FUTURES_TESTNET_WS_URL = 'wss://demo-futures.kraken.com/ws/v1';
    public static FUTURES_TESTNET_BASE_URL = 'https://demo-futures.kraken.com/derivatives/api/v3';
    public static FUTURES_TESTNET_CHARTS_BASE_URL = 'https://demo-futures.kraken.com/api/charts/v1';

    private lastNonce: number = 0;

    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
        this._AXIOS_INSTANCE = axios.create({
            httpAgent: this._HTTP_AGENT,
            httpsAgent: this._HTTPS_AGENT
        });
    }

    protected getBaseUrl(marketType: KrakenMarketType): string {
        if (marketType === 'spot') return KrakenBase.SPOT_BASE_URL;
        if (marketType === 'futures-charts') {
            return this.isTest ? KrakenBase.FUTURES_TESTNET_CHARTS_BASE_URL : KrakenBase.FUTURES_CHARTS_BASE_URL;
        }
        return this.isTest ? KrakenBase.FUTURES_TESTNET_BASE_URL : KrakenBase.FUTURES_BASE_URL;
    }

    public getStreamUrl(marketType: 'spot' | 'futures'): string {
        if (marketType === 'spot') return KrakenBase.SPOT_WS_URL;
        return this.isTest ? KrakenBase.FUTURES_TESTNET_WS_URL : KrakenBase.FUTURES_WS_URL;
    }

    public async setTimeOffset(): Promise<void> {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        } catch (e) {
            console.error('Failed to set Kraken time offset', e);
        }
    }

    public async getServerTime(): Promise<number> {
        const res = await this._AXIOS_INSTANCE.get(`${KrakenBase.SPOT_BASE_URL}/0/public/Time`);
        const data = res.data as KrakenSpotResponse<{ unixtime: number }>;
        if (data && data.result && typeof data.result.unixtime === 'number') {
            return data.result.unixtime * 1000;
        }
        return Date.now();
    }

    protected generateSignature(_queryString: string): string {
        return '';
    }

    protected getNonce(): number {
        const now = Date.now();
        if (now <= this.lastNonce) {
            this.lastNonce += 1;
        } else {
            this.lastNonce = now;
        }
        return this.lastNonce;
    }

    protected buildSpotSignature(urlPath: string, params: KrakenRequestParams): string {
        const nonceValue = params.nonce;
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined) continue;
            searchParams.append(key, String(value));
        }
        const postData = searchParams.toString();
        const encoded = `${nonceValue ?? ''}${postData}`;
        const hash = crypto.createHash('sha256').update(encoded).digest();
        const message = Buffer.concat([Buffer.from(urlPath), hash]);
        const secret = Buffer.from(this.apiSecret, 'base64');
        return crypto.createHmac('sha512', secret).update(message).digest('base64');
    }

    protected buildFuturesSignature(endpointPath: string, params: KrakenRequestParams, nonce: number): string {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined) continue;
            searchParams.append(key, String(value));
        }
        const postData = searchParams.toString();
        const encoded = `${postData}${nonce}${endpointPath}`;
        const hash = crypto.createHash('sha256').update(encoded).digest();
        const secret = Buffer.from(this.apiSecret, 'base64');
        return crypto.createHmac('sha512', secret).update(hash).digest('base64');
    }

    protected formatSpotResponse<T>(data?: KrakenSpotResponse<T>, errors?: string): FormattedResponse<T> {
        if (errors) return this.formattedResponse({ errors });
        if (!data) return this.formattedResponse({ errors: 'No response data' });
        if (Array.isArray(data.error) && data.error.length > 0) {
            return this.formattedResponse({ errors: data.error.join(', ') });
        }
        return this.formattedResponse({ data: data.result });
    }

    protected formatFuturesResponse<T>(data?: KrakenFuturesBaseResponse & T, errors?: string): FormattedResponse<T> {
        if (errors) return this.formattedResponse({ errors });
        if (!data) return this.formattedResponse({ errors: 'No response data' });
        if (data.result && data.result !== 'success' && data.result !== 'ok') {
            return this.formattedResponse({ errors: data.error || `Futures API error: ${data.result}` });
        }
        if (data.error) return this.formattedResponse({ errors: data.error });
        return this.formattedResponse({ data: data as T });
    }

    public async publicRequest<T>(
        marketType: KrakenMarketType,
        method: 'GET' | 'POST',
        endpoint: string,
        params: KrakenRequestParams = {}
    ): Promise<FormattedResponse<T>> {
        try {
            const baseUrl = this.getBaseUrl(marketType);
            const response: AxiosResponse = await this._AXIOS_INSTANCE.request({
                method,
                url: `${baseUrl}${endpoint}`,
                params
            });

            if (marketType === 'spot') {
                return this.formatSpotResponse<T>(response.data as KrakenSpotResponse<T>);
            }

            return this.formatFuturesResponse<T>(response.data as KrakenFuturesBaseResponse & T);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return this.formattedResponse({ errors: `Failed to make request: ${message}` });
        }
    }

    public async signedRequest<T>(
        marketType: KrakenMarketType,
        method: 'POST' | 'GET',
        endpoint: string,
        params: KrakenRequestParams = {}
    ): Promise<FormattedResponse<T>> {
        try {
            if (marketType === 'spot') {
                const nonce = this.getNonce();
                const payload = { ...params, nonce };
                const urlPath = `/0/private${endpoint}`;
                const signature = this.buildSpotSignature(urlPath, payload);
                const searchParams = new URLSearchParams();
                for (const [key, value] of Object.entries(payload)) {
                    if (value === undefined) continue;
                    searchParams.append(key, String(value));
                }
                const postData = searchParams.toString();

                const response: AxiosResponse = await this._AXIOS_INSTANCE.request({
                    method: 'POST',
                    url: `${KrakenBase.SPOT_BASE_URL}${urlPath}`,
                    headers: {
                        'API-Key': this.apiKey,
                        'API-Sign': signature,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: postData
                });

                return this.formatSpotResponse<T>(response.data as KrakenSpotResponse<T>);
            }

            const nonce = this.getNonce();
            const endpointPath = endpoint.startsWith('/api/v3') ? endpoint : `/api/v3${endpoint}`;
            const signature = this.buildFuturesSignature(endpointPath, params, nonce);
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined) continue;
                searchParams.append(key, String(value));
            }
            const postData = searchParams.toString();
            const url = `${this.getBaseUrl('futures')}${endpoint}`;

            const response: AxiosResponse = await this._AXIOS_INSTANCE.request({
                method,
                url,
                headers: {
                    'APIKey': this.apiKey,
                    'Authent': signature,
                    'Nonce': nonce.toString(),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: method === 'POST' ? postData : undefined,
                params: method === 'GET' ? params : undefined
            });

            return this.formatFuturesResponse<T>(response.data as KrakenFuturesBaseResponse & T);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return this.formattedResponse({ errors: `Failed to make request: ${message}` });
        }
    }
}
