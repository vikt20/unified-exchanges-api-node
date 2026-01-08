import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import { FormattedResponse } from '../core/types.js';
export default class BybitBase extends AbstractExchangeBase {
    static BASE_URL_MAINNET: string;
    static BASE_URL_TESTNET: string;
    static WS_PUBLIC_LINEAR_MAINNET: string;
    static WS_PUBLIC_SPOT_MAINNET: string;
    static WS_PRIVATE_MAINNET: string;
    static WS_PUBLIC_LINEAR_TESTNET: string;
    static WS_PUBLIC_SPOT_TESTNET: string;
    static WS_PRIVATE_TESTNET: string;
    constructor(apiKey?: string, apiSecret?: string, isTest?: boolean);
    protected getBaseUrl(marketType: string): string;
    getStreamUrl(marketType: 'linear' | 'spot' | 'private'): string;
    setTimeOffset(): Promise<void>;
    getServerTime(): Promise<number>;
    protected generateSignature(parameters: string): string;
    protected formattedResponse<T>(object: {
        data?: any;
        errors?: string;
    }): FormattedResponse<T>;
    publicRequest<T>(marketType: string, method: string, endpoint: string, params?: Record<string, any>): Promise<FormattedResponse<T>>;
    protected signedRequest(_marketType: string, // Unused for Bybit unified
    method: 'POST' | 'GET', endpoint: string, params?: any): Promise<FormattedResponse<any>>;
}
//# sourceMappingURL=BybitBase.d.ts.map