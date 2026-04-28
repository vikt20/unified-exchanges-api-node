import * as crypto from 'crypto';
import { convertObjectIntoUrlEncoded } from './converters.js';
import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
export default class BinanceBase extends AbstractExchangeBase {
    static FUTURES_PUBLIC_STREAM_URL = 'wss://fstream.binance.com/public/ws/';
    static FUTURES_MARKET_STREAM_URL = 'wss://fstream.binance.com/market/ws/';
    static FUTURES_PRIVATE_STREAM_URL = 'wss://fstream.binance.com/private/ws';
    static FUTURES_PUBLIC_STREAM_URL_COMBINED = 'wss://fstream.binance.com/public/stream?streams=';
    static FUTURES_MARKET_STREAM_URL_COMBINED = 'wss://fstream.binance.com/market/stream?streams=';
    static FUTURES_PRIVATE_STREAM_URL_COMBINED = 'wss://fstream.binance.com/private/stream?';
    static SPOT_STREAM_URL = 'wss://stream.binance.com:9443/ws/';
    static SPOT_STREAM_URL_COMBINED = 'wss://stream.binance.com:9443/stream?streams=';
    static FUTURES_BASE_URL = 'https://fapi.binance.com';
    static SPOT_BASE_URL = 'https://api.binance.com';
    static FUTURES_WS_API_URL = 'wss://ws-fapi.binance.com/ws-fapi/v1';
    static FUTURES_PUBLIC_STREAM_URL_TESTNET = 'wss://stream.binancefuture.com/ws/';
    static FUTURES_MARKET_STREAM_URL_TESTNET = 'wss://stream.binancefuture.com/ws/';
    static FUTURES_PRIVATE_STREAM_URL_TESTNET = 'wss://stream.binancefuture.com/ws/';
    static SPOT_STREAM_URL_TESTNET = 'wss://stream.testnet.binance.vision/ws/';
    static FUTURES_PUBLIC_STREAM_URL_COMBINED_TESTNET = 'wss://stream.binancefuture.com/stream?streams=';
    static FUTURES_MARKET_STREAM_URL_COMBINED_TESTNET = 'wss://stream.binancefuture.com/stream?streams=';
    static FUTURES_PRIVATE_STREAM_URL_COMBINED_TESTNET = 'wss://stream.binancefuture.com/stream?';
    static SPOT_STREAM_URL_COMBINED_TESTNET = 'wss://stream.testnet.binance.vision/stream?streams=';
    static FUTURES_BASE_URL_TESTNET = 'https://testnet.binancefuture.com';
    static SPOT_BASE_URL_TESTNET = 'https://testnet.binance.vision';
    static FUTURES_WS_API_URL_TESTNET = 'wss://testnet.binancefuture.com/ws-fapi/v1';
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
        this.setTimeOffset();
    }
    // ━━ Abstract Method Implementations ━━
    getBaseUrl(marketType) {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.SPOT_BASE_URL_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL : BinanceBase.SPOT_BASE_URL;
    }
    getStreamUrl(marketType, category) {
        if (marketType !== 'futures') {
            return this.isTest ? BinanceBase.SPOT_STREAM_URL_TESTNET : BinanceBase.SPOT_STREAM_URL;
        }
        const resolvedCategory = category ?? 'market';
        if (this.isTest) {
            if (resolvedCategory === 'public')
                return BinanceBase.FUTURES_PUBLIC_STREAM_URL_TESTNET;
            if (resolvedCategory === 'private')
                return BinanceBase.FUTURES_PRIVATE_STREAM_URL_TESTNET;
            return BinanceBase.FUTURES_MARKET_STREAM_URL_TESTNET;
        }
        if (resolvedCategory === 'public')
            return BinanceBase.FUTURES_PUBLIC_STREAM_URL;
        if (resolvedCategory === 'private')
            return BinanceBase.FUTURES_PRIVATE_STREAM_URL;
        return BinanceBase.FUTURES_MARKET_STREAM_URL;
    }
    getCombinedStreamUrl(marketType, category) {
        if (marketType !== 'futures') {
            return this.isTest ? BinanceBase.SPOT_STREAM_URL_COMBINED_TESTNET : BinanceBase.SPOT_STREAM_URL_COMBINED;
        }
        const resolvedCategory = category ?? 'market';
        if (this.isTest) {
            if (resolvedCategory === 'public')
                return BinanceBase.FUTURES_PUBLIC_STREAM_URL_COMBINED_TESTNET;
            if (resolvedCategory === 'private')
                return BinanceBase.FUTURES_PRIVATE_STREAM_URL_COMBINED_TESTNET;
            return BinanceBase.FUTURES_MARKET_STREAM_URL_COMBINED_TESTNET;
        }
        if (resolvedCategory === 'public')
            return BinanceBase.FUTURES_PUBLIC_STREAM_URL_COMBINED;
        if (resolvedCategory === 'private')
            return BinanceBase.FUTURES_PRIVATE_STREAM_URL_COMBINED;
        return BinanceBase.FUTURES_MARKET_STREAM_URL_COMBINED;
    }
    getFuturesWsApiUrl() {
        return this.isTest ? BinanceBase.FUTURES_WS_API_URL_TESTNET : BinanceBase.FUTURES_WS_API_URL;
    }
    generateSignature(queryString) {
        return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    }
    async getFuturesListenKey() {
        return await this.signedRequest('futures', 'POST', '/fapi/v1/listenKey');
    }
    async keepAliveListenKey(type) {
        return type === 'futures' ? await this.signedRequest(type, 'PUT', '/fapi/v1/listenKey') : await this.signedRequest(type, 'PUT', '/api/v3/userDataStream');
    }
    async setTimeOffset() {
        try {
            const serverTime = await this.getServerTime();
            const localTime = Date.now();
            this.timeOffset = localTime - serverTime;
        }
        catch (error) {
            throw new Error(`Failed to set time offset`);
        }
    }
    async getServerTime() {
        try {
            const baseUrl = this.isTest ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.FUTURES_BASE_URL;
            const response = await this._AXIOS_INSTANCE.get(`${baseUrl}/fapi/v1/time`);
            return response.data.serverTime;
        }
        catch (error) {
            throw new Error(`Failed to retrieve server time`);
        }
    }
    async publicRequest(type, method, endpoint, params = {}) {
        try {
            const _URL = this.getBaseUrl(type);
            const response = await this._AXIOS_INSTANCE.request({
                method: method,
                url: `${_URL}${endpoint}`,
                params: params
            });
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            if (error.response && error.response.data && error.response.data.msg) {
                return this.formattedResponse({ errors: error.response.data.msg });
            }
            else {
                return this.formattedResponse({ errors: `Failed to make request: ${error.message}` });
            }
        }
    }
    async signedRequest(type, method, endpoint, params = {}) {
        try {
            // const timestamp = Date.now();
            const timestamp = Date.now() - this.timeOffset;
            params.timestamp = timestamp;
            const queryString = convertObjectIntoUrlEncoded(params);
            const signature = this.generateSignature(queryString);
            // console.log(`query:`, queryString);
            const _URL = this.getBaseUrl(type);
            const response = await this._AXIOS_INSTANCE.request({
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
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            if (error.response && error.response.data && error.response.data.msg) {
                return this.formattedResponse({ errors: error.response.data.msg });
            }
            else {
                return this.formattedResponse({ errors: `Failed to make request: ${error.message}` });
            }
        }
    }
    formattedResponse(object) {
        return {
            success: object.errors === undefined ? true : false,
            data: object.data,
            errors: object.errors
        };
    }
}
