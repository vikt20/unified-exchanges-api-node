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
const AbstractExchangeBase_js_1 = require("../core/AbstractExchangeBase.js");
const crypto = __importStar(require("crypto"));
const converters_js_1 = require("./converters.js");
class BybitBase extends AbstractExchangeBase_js_1.AbstractExchangeBase {
    static BASE_URL_MAINNET = 'https://api.bybit.com';
    static BASE_URL_TESTNET = 'https://api-testnet.bybit.com';
    // Bybit V5 Websocket URLs
    static WS_PUBLIC_LINEAR_MAINNET = 'wss://stream.bybit.com/v5/public/linear';
    static WS_PUBLIC_SPOT_MAINNET = 'wss://stream.bybit.com/v5/public/spot';
    static WS_PRIVATE_MAINNET = 'wss://stream.bybit.com/v5/private';
    // Add logic to toggle testnet if needed, defaulting to Mainnet for now
    isTestnet = false;
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret);
        // We can pass an optional flag for testnet later if required
    }
    getBaseUrl(marketType) {
        return this.isTestnet ? BybitBase.BASE_URL_TESTNET : BybitBase.BASE_URL_MAINNET;
    }
    getStreamUrl(marketType) {
        // Bybit distinguishes WSS by category in V5 public channels
        // For private, it's a single endpoint
        return BybitBase.WS_PUBLIC_LINEAR_MAINNET;
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
                const qs = (0, converters_js_1.convertObjectIntoUrlEncoded)(params); // We might need to sort? Bybit says "param_str". 
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
                return this.formattedResponse({ data: error.response.data });
            }
            return this.handleRequestError(error);
        }
    }
}
exports.default = BybitBase;
