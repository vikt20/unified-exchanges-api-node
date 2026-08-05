import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import * as crypto from 'crypto';
export default class OkxBase extends AbstractExchangeBase {
    exchange_id = 'OKX';
    static BASE_URL = 'https://www.okx.com';
    static BASE_URL_TESTNET = 'https://www.okx.com'; // OKX testnet is driven by a header usually, but there is no pure testnet URL? Wait, AWS OKX testnet URL is sometimes different, but they use the "x-simulated-trading" header. Let's use standard URL and maybe pass header later. Actually OKX uses the same endpoint, just specific headers or different accounts. Wait, their manual says testnet uses either a testnet API key or a specific flag. Let's just use `https://www.okx.com` for now.
    // OKX V5 Websocket URLs (Production)
    static WS_PUBLIC = 'wss://ws.okx.com:8443/ws/v5/public';
    static WS_PRIVATE = 'wss://ws.okx.com:8443/ws/v5/private';
    static WS_BUSINESS = 'wss://ws.okx.com:8443/ws/v5/business';
    // OKX V5 Websocket URLs (Demo/Simulated Trading)
    static WS_PUBLIC_DEMO = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999';
    static WS_PRIVATE_DEMO = 'wss://wspap.okx.com:8443/ws/v5/private?brokerId=9999';
    static WS_BUSINESS_DEMO = 'wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999';
    apiPassphrase;
    ctValBySymbol = new Map();
    instIdCodeBySymbol = new Map();
    instrumentsLoadPromise;
    instrumentsReady = false;
    instrumentsLoadError;
    constructor(apiKey, apiSecret, apiPassphrase, isTest = false, exchangeInfoFutures) {
        super(apiKey, apiSecret, isTest);
        this.apiPassphrase = apiPassphrase || '';
        if (exchangeInfoFutures !== false) {
            // For futures only
            if (exchangeInfoFutures !== undefined) {
                console.log(`Loading OKX instruments (${exchangeInfoFutures.length}) metadata from constructor...`);
                this.loadCtValFromExchangeInfo(exchangeInfoFutures);
                this.instrumentsReady = true;
                this.instrumentsLoadError = undefined;
                this.instrumentsLoadPromise = Promise.resolve();
                return;
            }
            else {
                void this.ensureInstrumentMetadataLoaded();
            }
        }
    }
    loadCtValFromExchangeInfo(exchangeInfoFutures) {
        this.ctValBySymbol.clear();
        this.instIdCodeBySymbol.clear();
        for (const item of exchangeInfoFutures) {
            const symbol = item.symbol;
            const ctVal = item.additionalInfo?.okx_ctVal;
            const instIdCode = item.additionalInfo?.okx_instIdCode ?? Number(item.rawData?.instIdCode || 0);
            if (!symbol)
                continue;
            if (Number.isFinite(ctVal) && ctVal > 0)
                this.ctValBySymbol.set(symbol, ctVal);
            if (Number.isFinite(instIdCode) && instIdCode > 0)
                this.instIdCodeBySymbol.set(symbol, instIdCode);
        }
    }
    getBaseUrl(_marketType) {
        return OkxBase.BASE_URL; // OKX uses same base URL for everything
    }
    getStreamUrl(channelType) {
        if (this.isTest) {
            if (channelType === 'public')
                return OkxBase.WS_PUBLIC_DEMO;
            if (channelType === 'private')
                return OkxBase.WS_PRIVATE_DEMO;
            return OkxBase.WS_BUSINESS_DEMO;
        }
        if (channelType === 'public')
            return OkxBase.WS_PUBLIC;
        if (channelType === 'private')
            return OkxBase.WS_PRIVATE;
        return OkxBase.WS_BUSINESS;
    }
    async setTimeOffset() {
        try {
            const serverTime = await this.getServerTime();
            this.timeOffset = Date.now() - serverTime;
        }
        catch (e) {
            console.error("Failed to set OKX time offset", e);
        }
    }
    async getServerTime() {
        const url = `${this.getBaseUrl('')}/api/v5/public/time`;
        const res = await this._AXIOS_INSTANCE.get(url);
        if (res.data && res.data.data && res.data.data[0]) {
            return Number(res.data.data[0].ts);
        }
        return Date.now();
    }
    // For Futures, we need to convert asset size to contracts and vice versa using ctVal from exchange info. For Spot, we can just pass through the values.
    async ensureInstrumentMetadataLoaded() {
        if (this.instrumentsReady)
            return;
        if (this.instrumentsLoadPromise)
            return this.instrumentsLoadPromise;
        this.instrumentsLoadPromise = (async () => {
            console.log('Requesting OKX instruments metadata...');
            const res = await this.publicRequest('public', 'GET', '/api/v5/public/instruments', { instType: 'SWAP' });
            if (res.success && res.data && Array.isArray(res.data)) {
                for (const item of res.data) {
                    const symbol = item.instId;
                    const ctVal = parseFloat(item.ctVal || '0');
                    if (symbol && Number.isFinite(ctVal) && ctVal > 0) {
                        this.ctValBySymbol.set(symbol, ctVal);
                    }
                    const instIdCode = Number(item.instIdCode || 0);
                    if (symbol && Number.isFinite(instIdCode) && instIdCode > 0) {
                        this.instIdCodeBySymbol.set(symbol, instIdCode);
                    }
                }
                this.instrumentsReady = true;
                this.instrumentsLoadError = undefined;
                return;
            }
            this.instrumentsReady = false;
            this.instrumentsLoadError = res.errors || 'Unknown error while loading instruments';
            console.warn('OKX instruments metadata load failed:', this.instrumentsLoadError);
        })();
        return this.instrumentsLoadPromise;
    }
    // Use Only for Futures endpoints that require contract value for conversions.
    async assertInstrumentsReady() {
        if (this.instrumentsLoadError) {
            throw new Error(`OKX instruments metadata unavailable: ${this.instrumentsLoadError}`);
        }
        if (!this.instrumentsReady) {
            await this.ensureInstrumentMetadataLoaded();
        }
    }
    getCtVal(symbol) {
        return this.ctValBySymbol.get(symbol);
    }
    getInstIdCode(symbol) {
        return this.instIdCodeBySymbol.get(symbol);
    }
    generateWebsocketSignature(payload) {
        return crypto.createHmac('sha256', this.apiSecret).update(payload).digest('base64');
    }
    convertAssetSizeToContracts(symbol, assetSize) {
        if (assetSize === undefined)
            return undefined;
        const ctVal = this.getCtVal(symbol);
        if (!ctVal || !Number.isFinite(ctVal))
            return assetSize;
        return assetSize / ctVal;
    }
    convertContractsToAssetSize(symbol, contracts) {
        if (contracts === undefined)
            return undefined;
        const ctVal = this.getCtVal(symbol);
        if (!ctVal || !Number.isFinite(ctVal))
            return contracts;
        return contracts * ctVal;
    }
    generateSignature(parameters) {
        // This is implemented in signedRequest directly because OKX needs method, path, etc.
        return '';
    }
    formattedResponse(object) {
        if (object.data && object.data.code && object.data.code !== '0') {
            return {
                success: false,
                data: undefined,
                errors: `${object.data.data[0]?.sMsg || object.data.msg}`
            };
        }
        const data = object.data?.data ? object.data.data : object.data;
        return {
            success: object.errors === undefined,
            data: data,
            errors: object.errors
        };
    }
    async publicRequest(marketType, method, endpoint, params = {}) {
        try {
            const baseUrl = this.getBaseUrl(marketType);
            const headers = {};
            if (this.isTest) {
                headers['x-simulated-trading'] = '1';
            }
            const response = await this._AXIOS_INSTANCE.request({
                method,
                url: `${baseUrl}${endpoint}`,
                params,
                headers
            });
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            return this.handleRequestError(error);
        }
    }
    async signedRequest(_marketType, method, endpoint, params = {}) {
        try {
            const timestamp = new Date(Date.now() - this.timeOffset).toISOString(); // ISO 8601 string
            let requestPath = endpoint;
            let body = '';
            if (method === 'GET') {
                const queryParts = [];
                for (const key of Object.keys(params)) {
                    // OKX doesn't strictly state it needs to be sorted, just properly encoded
                    if (params[key] !== undefined) {
                        queryParts.push(`${key}=${encodeURIComponent(params[key])}`);
                    }
                }
                if (queryParts.length > 0) {
                    requestPath += '?' + queryParts.join('&');
                }
            }
            else {
                body = JSON.stringify(params);
            }
            // sign = hmac_sha256(timestamp + method + requestPath + body, apiSecret)
            const signString = timestamp + method + requestPath + body;
            const signature = crypto.createHmac('sha256', this.apiSecret).update(signString).digest('base64');
            const headers = {
                'OK-ACCESS-KEY': this.apiKey,
                'OK-ACCESS-SIGN': signature,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': this.apiPassphrase,
                'Content-Type': 'application/json'
            };
            if (this.isTest) {
                headers['x-simulated-trading'] = '1';
            }
            const url = `${this.getBaseUrl('')}${requestPath}`;
            const config = {
                method,
                url,
                headers
            };
            if (method === 'POST') {
                config.data = body; // Already stringified
            }
            const response = await this._AXIOS_INSTANCE.request(config);
            console.log(`Request:`, endpoint, response.status);
            return this.formattedResponse({ data: response.data });
        }
        catch (error) {
            if (error.response?.status)
                console.log(`Error: ${endpoint} ${error.response.status}`);
            if (error.response?.data) {
                const data = error.response.data;
                const message = data.msg
                    ? `${data.code ?? error.response.status}: ${data.msg}`
                    : JSON.stringify(data);
                return this.formattedResponse({ errors: message });
            }
            return this.handleRequestError(error);
        }
    }
}
