import { AxiosError, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import type { FormattedResponse } from '../core/types.js';
import { BITGET_SUCCESS_CODE, BitgetEnvelope, BitgetProductType, isRecord, isString } from './converters.js';

export type BitgetMarketType = 'spot' | 'futures';
export type BitgetHttpMethod = 'GET' | 'POST';
export type BitgetParamValue = string | number | boolean | undefined;
export type BitgetParams = Record<string, BitgetParamValue>;

export default class BitgetBase extends AbstractExchangeBase {
    public readonly exchange_id = 'BITGET';
    public static BASE_URL = 'https://api.bitget.com';
    public static PUBLIC_WS_URL = 'wss://ws.bitget.com/v2/ws/public';
    public static PRIVATE_WS_URL = 'wss://ws.bitget.com/v2/ws/private';
    public static DEFAULT_PRODUCT_TYPE: BitgetProductType = 'USDT-FUTURES';
    public static DEFAULT_MARGIN_COIN = 'USDT';

    protected apiPassphrase: string;
    protected productType: BitgetProductType;
    protected marginCoin: string;

    constructor(
        apiKey?: string,
        apiSecret?: string,
        apiPassphrase?: string,
        isTest: boolean = false,
        productType: BitgetProductType = BitgetBase.DEFAULT_PRODUCT_TYPE,
        marginCoin: string = BitgetBase.DEFAULT_MARGIN_COIN
    ) {
        super(apiKey, apiSecret, isTest);
        this.apiPassphrase = apiPassphrase ?? '';
        this.productType = productType;
        this.marginCoin = marginCoin;
    }

    protected getBaseUrl(_marketType: string): string {
        return BitgetBase.BASE_URL;
    }

    public getStreamUrl(marketType: 'public' | 'private' | string): string {
        return marketType === 'private' ? BitgetBase.PRIVATE_WS_URL : BitgetBase.PUBLIC_WS_URL;
    }

    public async setTimeOffset(): Promise<void> {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        } catch {
            this.timeOffset = 0;
        }
    }

    public async getServerTime(): Promise<number> {
        const response: AxiosResponse<unknown> = await this._AXIOS_INSTANCE.get(`${BitgetBase.BASE_URL}/api/v2/public/time`);
        const data = response.data;
        if (isRecord(data) && isRecord(data.data) && isString(data.data.serverTime)) {
            return Number(data.data.serverTime);
        }
        if (isRecord(data) && isString(data.data)) {
            return Number(data.data);
        }
        return Date.now();
    }

    protected generateSignature(payload: string): string {
        return crypto.createHmac('sha256', this.apiSecret).update(payload).digest('base64');
    }

    protected getAuthTimestamp(): string {
        return (Date.now() - this.timeOffset).toString();
    }

    protected buildQuery(params: BitgetParams): string {
        return Object.entries(params)
            .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');
    }

    private buildSignPayload(timestamp: string, method: BitgetHttpMethod, endpoint: string, queryString: string, body: string): string {
        const path = queryString ? `${endpoint}?${queryString}` : endpoint;
        return `${timestamp}${method}${path}${body}`;
    }

    private requireCredentials(): string | undefined {
        if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
            return 'Bitget authenticated requests require apiKey, apiSecret, and apiPassphrase';
        }
        return undefined;
    }

    protected parseBitgetResponse<T>(data: unknown): FormattedResponse<T> {
        const envelope = data as BitgetEnvelope<unknown>;
        if (isRecord(envelope) && envelope.code !== BITGET_SUCCESS_CODE) {
            return this.formattedResponse({
                errors: `${String(envelope.code ?? 'UNKNOWN')}: ${String(envelope.msg ?? envelope.message ?? 'Bitget request failed')}`
            });
        }
        return this.formattedResponse({ data: envelope.data as T });
    }

    public async publicRequest<T>(
        _marketType: string,
        method: BitgetHttpMethod,
        endpoint: string,
        params: BitgetParams = {}
    ): Promise<FormattedResponse<T>> {
        try {
            const queryString = this.buildQuery(params);
            const url = `${this.getBaseUrl(_marketType)}${endpoint}${queryString ? `?${queryString}` : ''}`;
            const response: AxiosResponse<unknown> = await this._AXIOS_INSTANCE.request({
                method,
                url
            });
            return this.parseBitgetResponse<T>(response.data);
        } catch (error: unknown) {
            return this.handleBitgetRequestError<T>(error);
        }
    }

    public async signedRequest<T>(
        _marketType: string,
        method: BitgetHttpMethod,
        endpoint: string,
        params: BitgetParams = {}
    ): Promise<FormattedResponse<T>> {
        const credentialError = this.requireCredentials();
        if (credentialError) return this.formattedResponse({ errors: credentialError });

        try {
            const timestamp = this.getAuthTimestamp();
            const queryString = method === 'GET' ? this.buildQuery(params) : '';
            const body = method === 'POST' ? JSON.stringify(this.cleanParams(params)) : '';
            const signPayload = this.buildSignPayload(timestamp, method, endpoint, queryString, body);
            const signature = this.generateSignature(signPayload);
            const url = `${this.getBaseUrl(_marketType)}${endpoint}${queryString ? `?${queryString}` : ''}`;

            const response: AxiosResponse<unknown> = await this._AXIOS_INSTANCE.request({
                method,
                url,
                data: method === 'POST' ? this.cleanParams(params) : undefined,
                headers: {
                    'ACCESS-KEY': this.apiKey,
                    'ACCESS-SIGN': signature,
                    'ACCESS-TIMESTAMP': timestamp,
                    'ACCESS-PASSPHRASE': this.apiPassphrase,
                    'Content-Type': 'application/json',
                    locale: 'en-US'
                }
            });
            return this.parseBitgetResponse<T>(response.data);
        } catch (error: unknown) {
            return this.handleBitgetRequestError<T>(error);
        }
    }

    protected cleanParams(params: BitgetParams): Record<string, string | number | boolean> {
        return Object.fromEntries(
            Object.entries(params).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
        );
    }

    protected handleBitgetRequestError<T>(error: unknown): FormattedResponse<T> {
        if (error instanceof AxiosError) {
            const data = error.response?.data;
            if (isRecord(data)) {
                const message = isString(data.msg) ? data.msg : isString(data.message) ? data.message : JSON.stringify(data);
                return this.formattedResponse({ errors: message });
            }
            return this.formattedResponse({ errors: error.message });
        }
        if (error instanceof Error) return this.formattedResponse({ errors: error.message });
        return this.formattedResponse({ errors: 'Failed to make Bitget request' });
    }
}
