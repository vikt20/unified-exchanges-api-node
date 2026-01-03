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
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { FormattedResponse } from './types.js';

/**
 * Abstract base class for exchange API clients.
 * 
 * Provides shared infrastructure for HTTP requests, connection management,
 * and response formatting. Exchange-specific implementations extend this
 * class and implement abstract methods for authentication and URL patterns.
 */
export abstract class AbstractExchangeBase {
    protected apiKey: string;
    protected apiSecret: string;

    // HTTP connection pooling for performance
    protected _HTTP_AGENT = new http.Agent({ keepAlive: true, timeout: 3600000 });
    protected _HTTPS_AGENT = new https.Agent({ keepAlive: true, timeout: 3600000 });
    protected _AXIOS_INSTANCE: AxiosInstance;

    // Time synchronization
    protected timeOffset: number = 0;
    protected recvWindow: number = 3000;

    // Lifecycle management
    protected pingServerInterval: NodeJS.Timeout | undefined;

    constructor(apiKey?: string, apiSecret?: string) {
        this.apiKey = apiKey || '';
        this.apiSecret = apiSecret || '';
        this._AXIOS_INSTANCE = axios.create({
            httpAgent: this._HTTP_AGENT,
            httpsAgent: this._HTTPS_AGENT
        });
    }

    /**
     * Clean up resources (intervals, connections)
     */
    public destroy(): void {
        if (this.pingServerInterval) {
            clearInterval(this.pingServerInterval);
        }
    }

    // ━━ Abstract Methods (Exchange-Specific) ━━

    /**
     * Get the base URL for REST API calls
     */
    protected abstract getBaseUrl(marketType: string): string;

    /**
     * Get the base URL for WebSocket streams  
     */
    protected abstract getStreamUrl(marketType: string): string;

    /**
     * Synchronize local time with exchange server
     */
    public abstract setTimeOffset(): Promise<void>;

    /**
     * Get current server time from exchange
     */
    public abstract getServerTime(): Promise<number>;

    /**
     * Generate authentication signature for signed requests
     */
    protected abstract generateSignature(queryString: string): string;

    // ━━ Shared Utility Methods ━━

    /**
     * Format API response into standard structure
     */
    protected formattedResponse<T>(object: { data?: T; errors?: string }): FormattedResponse<T> {
        return {
            success: object.errors === undefined,
            data: object.data,
            errors: object.errors
        };
    }

    /**
     * Make an unauthenticated public API request
     */
    protected async publicRequest<T>(
        marketType: string,
        method: string,
        endpoint: string,
        params: Record<string, any> = {}
    ): Promise<FormattedResponse<T>> {
        try {
            const baseUrl = this.getBaseUrl(marketType);
            const response: AxiosResponse<T> = await this._AXIOS_INSTANCE.request({
                method,
                url: `${baseUrl}${endpoint}`,
                params
            });
            return this.formattedResponse({ data: response.data });
        } catch (error: any) {
            return this.handleRequestError(error);
        }
    }

    /**
     * Handle request errors and format response
     */
    protected handleRequestError(error: any): FormattedResponse<any> {
        if (error.response?.data?.msg) {
            return this.formattedResponse({ errors: error.response.data.msg });
        }
        return this.formattedResponse({ errors: `Failed to make request: ${error.message}` });
    }
}
