import { AbstractExchangeBase } from '../core/AbstractExchangeBase.js';
import { FormattedResponse } from '../core/types.js';
export default class OkxBase extends AbstractExchangeBase {
    static BASE_URL: string;
    static BASE_URL_TESTNET: string;
    static WS_PUBLIC: string;
    static WS_PRIVATE: string;
    static WS_BUSINESS: string;
    static WS_PUBLIC_DEMO: string;
    static WS_PRIVATE_DEMO: string;
    static WS_BUSINESS_DEMO: string;
    protected apiPassphrase?: string;
    protected ctValBySymbol: Map<string, number>;
    private instrumentsLoadPromise?;
    instrumentsReady: boolean;
    private instrumentsLoadError?;
    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest?: boolean);
    protected getBaseUrl(_marketType: string): string;
    getStreamUrl(channelType: 'public' | 'private' | 'business'): string;
    setTimeOffset(): Promise<void>;
    getServerTime(): Promise<number>;
    protected ensureInstrumentMetadataLoaded(): Promise<void>;
    protected assertInstrumentsReady(): Promise<void>;
    protected getCtVal(symbol: string): number | undefined;
    protected convertAssetSizeToContracts(symbol: string, assetSize?: number): number | undefined;
    protected convertContractsToAssetSize(symbol: string, contracts?: number): number | undefined;
    protected generateSignature(parameters: string): string;
    protected formattedResponse<T>(object: {
        data?: any;
        errors?: string;
    }): FormattedResponse<T>;
    publicRequest<T>(marketType: string, method: string, endpoint: string, params?: Record<string, any>): Promise<FormattedResponse<T>>;
    signedRequest(_marketType: string, method: 'POST' | 'GET', endpoint: string, params?: any): Promise<FormattedResponse<any>>;
}
//# sourceMappingURL=OkxBase.d.ts.map