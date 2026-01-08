"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const converters_js_1 = require("./converters.js");
const AbstractExchangeBase_js_1 = require("../core/AbstractExchangeBase.js");
class BinanceBase extends AbstractExchangeBase_js_1.AbstractExchangeBase {
    static FUTURES_STREAM_URL = 'wss://fstream.binance.com/ws/';
    static SPOT_STREAM_URL = 'wss://stream.binance.com:9443/ws/';
    static FUTURES_STREAM_URL_COMBINED = 'wss://fstream.binance.com/stream?streams=';
    static SPOT_STREAM_URL_COMBINED = 'wss://stream.binance.com:9443/stream?streams=';
    static FUTURES_BASE_URL = 'https://fapi.binance.com';
    static SPOT_BASE_URL = 'https://api.binance.com';
    static FUTURES_STREAM_URL_TESTNET = 'wss://stream.binancefuture.com/ws/';
    static SPOT_STREAM_URL_TESTNET = 'wss://stream.testnet.binance.vision/ws/';
    static FUTURES_STREAM_URL_COMBINED_TESTNET = 'wss://stream.binancefuture.com/stream?streams=';
    static SPOT_STREAM_URL_COMBINED_TESTNET = 'wss://stream.testnet.binance.vision/stream?streams=';
    static FUTURES_BASE_URL_TESTNET = 'https://testnet.binancefuture.com';
    static SPOT_BASE_URL_TESTNET = 'https://testnet.binance.vision';
    constructor(apiKey, apiSecret, isTest = false, pingServer = false) {
        super(apiKey, apiSecret, isTest);
        if (pingServer)
            this.doPingServer();
        this.setTimeOffset();
    }
    doPingServer() {
        const baseUrl = this.isTest ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.FUTURES_BASE_URL;
        if (this.pingServerInterval) {
            clearInterval(this.pingServerInterval);
        }
        this.pingServerInterval = setInterval(() => this._AXIOS_INSTANCE.get(`${baseUrl}/fapi/v1/ping`).catch(() => { }), 30000);
    }
    // ━━ Abstract Method Implementations ━━
    getBaseUrl(marketType) {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL_TESTNET : BinanceBase.SPOT_BASE_URL_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_BASE_URL : BinanceBase.SPOT_BASE_URL;
    }
    getStreamUrl(marketType) {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_TESTNET : BinanceBase.SPOT_STREAM_URL_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL : BinanceBase.SPOT_STREAM_URL;
    }
    getCombinedStreamUrl(marketType) {
        if (this.isTest) {
            return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_COMBINED_TESTNET : BinanceBase.SPOT_STREAM_URL_COMBINED_TESTNET;
        }
        return marketType === 'futures' ? BinanceBase.FUTURES_STREAM_URL_COMBINED : BinanceBase.SPOT_STREAM_URL_COMBINED;
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
            const queryString = (0, converters_js_1.convertObjectIntoUrlEncoded)(params);
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
exports.default = BinanceBase;
