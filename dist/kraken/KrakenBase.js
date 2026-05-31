import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import axios from 'axios';
import crypto from 'crypto';
export default class KrakenBase extends AbstractExchangeBase {
    static SPOT_BASE_URL = 'https://api.kraken.com';
    static FUTURES_BASE_URL = 'https://futures.kraken.com/derivatives/api/v3';
    static FUTURES_CHARTS_BASE_URL = 'https://futures.kraken.com/api/charts/v1';
    static SPOT_WS_URL = 'wss://ws.kraken.com/v2';
    static FUTURES_WS_URL = 'wss://futures.kraken.com/ws/v1';
    static FUTURES_TESTNET_WS_URL = 'wss://demo-futures.kraken.com/ws/v1';
    static FUTURES_TESTNET_BASE_URL = 'https://demo-futures.kraken.com/derivatives/api/v3';
    static FUTURES_TESTNET_CHARTS_BASE_URL = 'https://demo-futures.kraken.com/api/charts/v1';
    lastNonce = 0;
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
        this._AXIOS_INSTANCE = axios.create({
            httpAgent: this._HTTP_AGENT,
            httpsAgent: this._HTTPS_AGENT
        });
    }
    getBaseUrl(marketType) {
        if (marketType === 'spot')
            return KrakenBase.SPOT_BASE_URL;
        if (marketType === 'futures-charts') {
            return this.isTest ? KrakenBase.FUTURES_TESTNET_CHARTS_BASE_URL : KrakenBase.FUTURES_CHARTS_BASE_URL;
        }
        return this.isTest ? KrakenBase.FUTURES_TESTNET_BASE_URL : KrakenBase.FUTURES_BASE_URL;
    }
    getStreamUrl(marketType) {
        if (marketType === 'spot')
            return KrakenBase.SPOT_WS_URL;
        return this.isTest ? KrakenBase.FUTURES_TESTNET_WS_URL : KrakenBase.FUTURES_WS_URL;
    }
    async setTimeOffset() {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        }
        catch (e) {
            console.error('Failed to set Kraken time offset', e);
        }
    }
    async getServerTime() {
        const res = await this._AXIOS_INSTANCE.get(`${KrakenBase.SPOT_BASE_URL}/0/public/Time`);
        const data = res.data;
        if (data && data.result && typeof data.result.unixtime === 'number') {
            return data.result.unixtime * 1000;
        }
        return Date.now();
    }
    generateSignature(_queryString) {
        return '';
    }
    getNonce() {
        const now = Date.now();
        if (now <= this.lastNonce) {
            this.lastNonce += 1;
        }
        else {
            this.lastNonce = now;
        }
        return this.lastNonce;
    }
    buildSpotSignature(urlPath, params) {
        const nonceValue = params.nonce;
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined)
                continue;
            searchParams.append(key, String(value));
        }
        const postData = searchParams.toString();
        const encoded = `${nonceValue ?? ''}${postData}`;
        const hash = crypto.createHash('sha256').update(encoded).digest();
        const message = Buffer.concat([Buffer.from(urlPath), hash]);
        const secret = Buffer.from(this.apiSecret, 'base64');
        return crypto.createHmac('sha512', secret).update(message).digest('base64');
    }
    buildFuturesSignature(endpointPath, params, nonce) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined)
                continue;
            searchParams.append(key, String(value));
        }
        const postData = searchParams.toString();
        const encoded = `${postData}${nonce}${endpointPath}`;
        const hash = crypto.createHash('sha256').update(encoded).digest();
        const secret = Buffer.from(this.apiSecret, 'base64');
        return crypto.createHmac('sha512', secret).update(hash).digest('base64');
    }
    formatSpotResponse(data, errors) {
        if (errors)
            return this.formattedResponse({ errors });
        if (!data)
            return this.formattedResponse({ errors: 'No response data' });
        if (Array.isArray(data.error) && data.error.length > 0) {
            return this.formattedResponse({ errors: data.error.join(', ') });
        }
        return this.formattedResponse({ data: data.result });
    }
    formatFuturesResponse(data, errors) {
        if (errors)
            return this.formattedResponse({ errors });
        if (!data)
            return this.formattedResponse({ errors: 'No response data' });
        if (data.result && data.result !== 'success' && data.result !== 'ok') {
            return this.formattedResponse({ errors: data.error || `Futures API error: ${data.result}` });
        }
        if (data.error)
            return this.formattedResponse({ errors: data.error });
        return this.formattedResponse({ data: data });
    }
    async publicRequest(marketType, method, endpoint, params = {}) {
        try {
            const baseUrl = this.getBaseUrl(marketType);
            const response = await this._AXIOS_INSTANCE.request({
                method,
                url: `${baseUrl}${endpoint}`,
                params
            });
            if (marketType === 'spot') {
                return this.formatSpotResponse(response.data);
            }
            return this.formatFuturesResponse(response.data);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return this.formattedResponse({ errors: `Failed to make request: ${message}` });
        }
    }
    async signedRequest(marketType, method, endpoint, params = {}) {
        try {
            if (marketType === 'spot') {
                const nonce = this.getNonce();
                const payload = { ...params, nonce };
                const urlPath = `/0/private${endpoint}`;
                const signature = this.buildSpotSignature(urlPath, payload);
                const searchParams = new URLSearchParams();
                for (const [key, value] of Object.entries(payload)) {
                    if (value === undefined)
                        continue;
                    searchParams.append(key, String(value));
                }
                const postData = searchParams.toString();
                const response = await this._AXIOS_INSTANCE.request({
                    method: 'POST',
                    url: `${KrakenBase.SPOT_BASE_URL}${urlPath}`,
                    headers: {
                        'API-Key': this.apiKey,
                        'API-Sign': signature,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: postData
                });
                return this.formatSpotResponse(response.data);
            }
            const nonce = this.getNonce();
            const endpointPath = endpoint.startsWith('/api/v3') ? endpoint : `/api/v3${endpoint}`;
            const signature = this.buildFuturesSignature(endpointPath, params, nonce);
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined)
                    continue;
                searchParams.append(key, String(value));
            }
            const postData = searchParams.toString();
            const url = `${this.getBaseUrl('futures')}${endpoint}`;
            const response = await this._AXIOS_INSTANCE.request({
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
            return this.formatFuturesResponse(response.data);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return this.formattedResponse({ errors: `Failed to make request: ${message}` });
        }
    }
}
