/**
 * AbstractExchangeBase - Abstract Base Class for Exchange Clients
 *
 * Provides common functionality for all exchange implementations:
 * - HTTP client setup with connection pooling
 * - Formatted response helper
 * - Time offset synchronization pattern
 * - Lifecycle management (destroy)
 *
 * Each exchange extends this and implements abstract methods
 * for exchange-specific URL patterns and authentication.
 */
import http from 'http';
import https from 'https';
import axios from 'axios';
/**
 * Abstract base class for exchange API clients.
 *
 * Provides shared infrastructure for HTTP requests, connection management,
 * and response formatting. Exchange-specific implementations extend this
 * class and implement abstract methods for authentication and URL patterns.
 */
export class AbstractExchangeBase {
    apiKey;
    apiSecret;
    isTest;
    // HTTP connection pooling for performance
    _HTTP_AGENT = new http.Agent({ keepAlive: true, timeout: 3600000 });
    _HTTPS_AGENT = new https.Agent({ keepAlive: true, timeout: 3600000 });
    _AXIOS_INSTANCE;
    // Time synchronization
    timeOffset = 0;
    recvWindow = 3000;
    constructor(apiKey, apiSecret, isTest = false) {
        this.apiKey = apiKey || '';
        this.apiSecret = apiSecret || '';
        this.isTest = isTest;
        this._AXIOS_INSTANCE = axios.create({
            httpAgent: this._HTTP_AGENT,
            httpsAgent: this._HTTPS_AGENT
        });
    }
    // ━━ Shared Utility Methods ━━
    /**
     * Format API response into standard structure
     */
    formattedResponse(object) {
        return {
            success: object.errors === undefined,
            data: object.data,
            errors: object.errors
        };
    }
    /**
     * Make an unauthenticated public API request
     */
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
    async signedRequest(marketType, method, endpoint, params = {}) {
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
    /**
     * Handle request errors and format response
     */
    handleRequestError(error) {
        if (error.response?.data?.msg) {
            return this.formattedResponse({ errors: error.response.data.msg });
        }
        return this.formattedResponse({ errors: `Failed to make request: ${error.message}` });
    }
}
