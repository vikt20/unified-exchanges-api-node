import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import * as crypto from 'crypto';
import { convertObjectIntoUrlEncoded } from './converters.js';
export default class BybitBase extends AbstractExchangeBase {
    exchange_id = 'BYBIT';
    static BASE_URL_MAINNET = 'https://api.bybit.com';
    static BASE_URL_TESTNET = 'https://api-testnet.bybit.com';
    // Bybit V5 Websocket URLs
    static WS_PUBLIC_LINEAR_MAINNET = 'wss://stream.bybit.com/v5/public/linear';
    static WS_PUBLIC_SPOT_MAINNET = 'wss://stream.bybit.com/v5/public/spot';
    static WS_PRIVATE_MAINNET = 'wss://stream.bybit.com/v5/private';
    static WS_TRADE_MAINNET = 'wss://stream.bybit.com/v5/trade';
    static WS_PUBLIC_LINEAR_TESTNET = 'wss://stream-testnet.bybit.com/v5/public/linear';
    static WS_PUBLIC_SPOT_TESTNET = 'wss://stream-testnet.bybit.com/v5/public/spot';
    static WS_PRIVATE_TESTNET = 'wss://stream-testnet.bybit.com/v5/private';
    static WS_TRADE_TESTNET = 'wss://stream-testnet.bybit.com/v5/trade';
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
    }
    getBaseUrl(marketType) {
        return this.isTest ? BybitBase.BASE_URL_TESTNET : BybitBase.BASE_URL_MAINNET;
    }
    getStreamUrl(marketType) {
        if (this.isTest) {
            if (marketType === 'linear')
                return BybitBase.WS_PUBLIC_LINEAR_TESTNET;
            if (marketType === 'spot')
                return BybitBase.WS_PUBLIC_SPOT_TESTNET;
            return BybitBase.WS_PRIVATE_TESTNET;
        }
        if (marketType === 'linear')
            return BybitBase.WS_PUBLIC_LINEAR_MAINNET;
        if (marketType === 'spot')
            return BybitBase.WS_PUBLIC_SPOT_MAINNET;
        return BybitBase.WS_PRIVATE_MAINNET;
    }
    getTradingWsApiUrl() {
        return this.isTest ? BybitBase.WS_TRADE_TESTNET : BybitBase.WS_TRADE_MAINNET;
    }
    async setTimeOffset() {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        }
        catch (e) {
            console.error("Failed to set Bybit time offset", e);
        }
    }
    async getServerTime() {
        const url = `${this.getBaseUrl('linear')}/v5/market/time`;
        const res = await this._AXIOS_INSTANCE.get(url);
        // Bybit V5 response: { retCode: 0, result: { timeSecond: '...', timeNano: '...' }, time: 123... }
        if (res.data && res.data.time) {
            return Number(res.data.time);
        }
        return Date.now();
    }
    generateSignature(parameters) {
        // Bybit V5 uses X-BAPI-SIGN
        // Logic: hmac_sha256(timestamp + apiKey + recvWindow + queryString, apiSecret)
        // BUT, `parameters` argument here is just the query string as per AbstractExchangeBase.
        // We might need to override the signing method to fit Bybit's specific header reqs.
        // See signedRequest implementation.
        return crypto.createHmac('sha256', this.apiSecret).update(parameters).digest('hex');
    }
    // Override formattedResponse to handle Bybit structure
    formattedResponse(object) {
        // Check for Bybit specific error codes in 'data' if it's a raw response
        if (object.data && object.data.retCode !== undefined && object.data.retCode !== 0) {
            return {
                success: false,
                data: undefined,
                errors: `${object.data.retCode}: ${object.data.retMsg}`
            };
        }
        const data = object.data?.result ? object.data.result : object.data;
        return {
            success: object.errors === undefined,
            data: data,
            errors: object.errors
        };
    }
    // Override publicRequest to handle Bybit URL structure
    async publicRequest(marketType, method, endpoint, params = {}) {
        try {
            const baseUrl = this.getBaseUrl(marketType);
            const response = await this._AXIOS_INSTANCE.request({
                method,
                url: `${baseUrl}${endpoint}`,
                params
            });
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            return this.handleRequestError(error);
        }
    }
    // Override signedRequest because Bybit V5 signature is different from Binance
    async signedRequest(_marketType, // Unused for Bybit unified
    method, endpoint, params = {}) {
        try {
            const timestamp = Date.now() - this.timeOffset;
            const recvWindow = this.recvWindow;
            // Bybit Signature:
            // timestamp + apiKey + recvWindow + params
            // Params for GET: sorted query string
            // Params for POST: JSON string
            let payload = '';
            let url = `${this.getBaseUrl('linear')}${endpoint}`;
            const headers = {
                'X-BAPI-API-KEY': this.apiKey,
                'X-BAPI-TIMESTAMP': timestamp.toString(),
                'X-BAPI-RECV-WINDOW': recvWindow.toString(),
            };
            if (method === 'GET') {
                const qs = convertObjectIntoUrlEncoded(params); // We might need to sort? Bybit says "param_str". 
                // Actually Bybit V5 says: "Parameters... in the form of key=value"
                // Let's assume axios handles the query string order or it doesn't matter as much, 
                // BUT for signature it MUST match what is sent.
                // Safest to manually build query string.
                payload = qs;
                if (payload)
                    url += `?${payload}`;
            }
            else {
                // POST
                payload = JSON.stringify(params);
            }
            const signString = timestamp.toString() + this.apiKey + recvWindow.toString() + payload;
            const signature = crypto.createHmac('sha256', this.apiSecret).update(signString).digest('hex');
            headers['X-BAPI-SIGN'] = signature;
            // headers['Content-Type'] = 'application/json; charset=utf-8'; // Axios sets this for objects
            const config = {
                method,
                url,
                headers
            };
            if (method === 'POST') {
                config.data = params;
            }
            const response = await this._AXIOS_INSTANCE.request(config);
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            if (error.response?.data) {
                const data = error.response.data;
                const message = typeof data === 'string'
                    ? data
                    : data.retMsg
                        ? `${data.retCode ?? error.response.status}: ${data.retMsg}`
                        : JSON.stringify(data);
                return this.formattedResponse({ errors: message });
            }
            return this.handleRequestError(error);
        }
    }
}
