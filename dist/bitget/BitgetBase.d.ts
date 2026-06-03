import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import type { FormattedResponse } from '../core/types.js';
import { BitgetProductType } from './converters.js';
export type BitgetMarketType = 'spot' | 'futures';
export type BitgetHttpMethod = 'GET' | 'POST';
export type BitgetParamValue = string | number | boolean | undefined;
export type BitgetParams = Record<string, BitgetParamValue>;
export default class BitgetBase extends AbstractExchangeBase {
    static BASE_URL: string;
    static PUBLIC_WS_URL: string;
    static PRIVATE_WS_URL: string;
    static DEFAULT_PRODUCT_TYPE: BitgetProductType;
    static DEFAULT_MARGIN_COIN: string;
    protected apiPassphrase: string;
    protected productType: BitgetProductType;
    protected marginCoin: string;
    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest?: boolean, productType?: BitgetProductType, marginCoin?: string);
    protected getBaseUrl(_marketType: string): string;
    getStreamUrl(marketType: 'public' | 'private' | string): string;
    setTimeOffset(): Promise<void>;
    getServerTime(): Promise<number>;
    protected generateSignature(payload: string): string;
    protected getAuthTimestamp(): string;
    protected buildQuery(params: BitgetParams): string;
    private buildSignPayload;
    private requireCredentials;
    protected parseBitgetResponse<T>(data: unknown): FormattedResponse<T>;
    publicRequest<T>(_marketType: string, method: BitgetHttpMethod, endpoint: string, params?: BitgetParams): Promise<FormattedResponse<T>>;
    signedRequest<T>(_marketType: string, method: BitgetHttpMethod, endpoint: string, params?: BitgetParams): Promise<FormattedResponse<T>>;
    protected cleanParams(params: BitgetParams): Record<string, string | number | boolean>;
    protected handleBitgetRequestError<T>(error: unknown): FormattedResponse<T>;
}
//# sourceMappingURL=BitgetBase.d.ts.map