import type { ExchangeInfoStreamCallback, ExchangeInfoStreamOptions, ExtractedInfo, FormattedResponse, HandleWebSocket, SocketStatus } from './types.js';
export declare const DEFAULT_EXCHANGE_INFO_POLLING_INTERVAL_MS: number;
export declare function createExchangeInfoPollingStream(fetchExchangeInfo: () => Promise<FormattedResponse<Record<string, ExtractedInfo>>>, callback: ExchangeInfoStreamCallback, register: (subscription: {
    id: string;
    disconnect: () => void;
}) => void, statusCallback?: (status: SocketStatus) => void, options?: ExchangeInfoStreamOptions): Promise<HandleWebSocket>;
//# sourceMappingURL=exchangeInfoPolling.d.ts.map