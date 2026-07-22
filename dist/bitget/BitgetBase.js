import { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import { BITGET_SUCCESS_CODE, isRecord, isString } from './converters.js';
export default class BitgetBase extends AbstractExchangeBase {
    exchange_id = 'BITGET';
    static BASE_URL = 'https://api.bitget.com';
    static PUBLIC_WS_URL = 'wss://ws.bitget.com/v2/ws/public';
    static PRIVATE_WS_URL = 'wss://ws.bitget.com/v2/ws/private';
    static DEFAULT_PRODUCT_TYPE = 'USDT-FUTURES';
    static DEFAULT_MARGIN_COIN = 'USDT';
    apiPassphrase;
    productType;
    marginCoin;
    constructor(apiKey, apiSecret, apiPassphrase, isTest = false, productType = BitgetBase.DEFAULT_PRODUCT_TYPE, marginCoin = BitgetBase.DEFAULT_MARGIN_COIN) {
        super(apiKey, apiSecret, isTest);
        this.apiPassphrase = apiPassphrase ?? '';
        this.productType = productType;
        this.marginCoin = marginCoin;
    }
    getBaseUrl(_marketType) {
        return BitgetBase.BASE_URL;
    }
    getStreamUrl(marketType) {
        return marketType === 'private' ? BitgetBase.PRIVATE_WS_URL : BitgetBase.PUBLIC_WS_URL;
    }
    async setTimeOffset() {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        }
        catch {
            this.timeOffset = 0;
        }
    }
    async getServerTime() {
        const response = await this._AXIOS_INSTANCE.get(`${BitgetBase.BASE_URL}/api/v2/public/time`);
        const data = response.data;
        if (isRecord(data) && isRecord(data.data) && isString(data.data.serverTime)) {
            return Number(data.data.serverTime);
        }
        if (isRecord(data) && isString(data.data)) {
            return Number(data.data);
        }
        return Date.now();
    }
    generateSignature(payload) {
        return crypto.createHmac('sha256', this.apiSecret).update(payload).digest('base64');
    }
    getAuthTimestamp() {
        return (Date.now() - this.timeOffset).toString();
    }
    buildQuery(params) {
        return Object.entries(params)
            .filter((entry) => entry[1] !== undefined)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');
    }
    buildSignPayload(timestamp, method, endpoint, queryString, body) {
        const path = queryString ? `${endpoint}?${queryString}` : endpoint;
        return `${timestamp}${method}${path}${body}`;
    }
    requireCredentials() {
        if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
            return 'Bitget authenticated requests require apiKey, apiSecret, and apiPassphrase';
        }
        return undefined;
    }
    parseBitgetResponse(data) {
        const envelope = data;
        if (isRecord(envelope) && envelope.code !== BITGET_SUCCESS_CODE) {
            return this.formattedResponse({
                errors: `${String(envelope.code ?? 'UNKNOWN')}: ${String(envelope.msg ?? envelope.message ?? 'Bitget request failed')}`
            });
        }
        return this.formattedResponse({ data: envelope.data });
    }
    async publicRequest(_marketType, method, endpoint, params = {}) {
        try {
            const queryString = this.buildQuery(params);
            const url = `${this.getBaseUrl(_marketType)}${endpoint}${queryString ? `?${queryString}` : ''}`;
            const response = await this._AXIOS_INSTANCE.request({
                method,
                url
            });
            return this.parseBitgetResponse(response.data);
        }
        catch (error) {
            return this.handleBitgetRequestError(error);
        }
    }
    async signedRequest(_marketType, method, endpoint, params = {}) {
        const credentialError = this.requireCredentials();
        if (credentialError)
            return this.formattedResponse({ errors: credentialError });
        try {
            const timestamp = this.getAuthTimestamp();
            const queryString = method === 'GET' ? this.buildQuery(params) : '';
            const body = method === 'POST' ? JSON.stringify(this.cleanParams(params)) : '';
            const signPayload = this.buildSignPayload(timestamp, method, endpoint, queryString, body);
            const signature = this.generateSignature(signPayload);
            const url = `${this.getBaseUrl(_marketType)}${endpoint}${queryString ? `?${queryString}` : ''}`;
            const response = await this._AXIOS_INSTANCE.request({
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
            return this.parseBitgetResponse(response.data);
        }
        catch (error) {
            return this.handleBitgetRequestError(error);
        }
    }
    cleanParams(params) {
        return Object.fromEntries(Object.entries(params).filter((entry) => entry[1] !== undefined));
    }
    handleBitgetRequestError(error) {
        if (error instanceof AxiosError) {
            const data = error.response?.data;
            if (isRecord(data)) {
                const message = isString(data.msg) ? data.msg : isString(data.message) ? data.message : JSON.stringify(data);
                return this.formattedResponse({ errors: message });
            }
            return this.formattedResponse({ errors: error.message });
        }
        if (error instanceof Error)
            return this.formattedResponse({ errors: error.message });
        return this.formattedResponse({ errors: 'Failed to make Bitget request' });
    }
}
