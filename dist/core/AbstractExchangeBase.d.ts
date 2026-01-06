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
import { AxiosInstance } from 'axios';
import { FormattedResponse } from './types.js';
/**
 * Abstract base class for exchange API clients.
 *
 * Provides shared infrastructure for HTTP requests, connection management,
 * and response formatting. Exchange-specific implementations extend this
 * class and implement abstract methods for authentication and URL patterns.
 */
export declare abstract class AbstractExchangeBase {
    protected apiKey: string;
    protected apiSecret: string;
    protected _HTTP_AGENT: http.Agent;
    protected _HTTPS_AGENT: https.Agent;
    protected _AXIOS_INSTANCE: AxiosInstance;
    protected timeOffset: number;
    protected recvWindow: number;
    protected pingServerInterval: NodeJS.Timeout | undefined;
    constructor(apiKey?: string, apiSecret?: string);
    /**
     * Clean up resources (intervals, connections)
     */
    destroy(): void;
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
    abstract setTimeOffset(): Promise<void>;
    /**
     * Get current server time from exchange
     */
    abstract getServerTime(): Promise<number>;
    /**
     * Generate authentication signature for signed requests
     */
    protected abstract generateSignature(queryString: string): string;
    /**
     * Format API response into standard structure
     */
    protected formattedResponse<T>(object: {
        data?: T;
        errors?: string;
    }): FormattedResponse<T>;
    /**
     * Make an unauthenticated public API request
     */
    protected publicRequest<T>(marketType: string, method: string, endpoint: string, params?: Record<string, any>): Promise<FormattedResponse<T>>;
    /**
     * Handle request errors and format response
     */
    protected handleRequestError(error: any): FormattedResponse<any>;
}
//# sourceMappingURL=AbstractExchangeBase.d.ts.map