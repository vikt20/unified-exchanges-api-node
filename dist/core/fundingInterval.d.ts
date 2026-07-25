import type { FundingData } from './types.js';
export type FundingIntervalFetcher = (symbol: string) => Promise<number | undefined>;
/**
 * Enriches funding events without polling. The first event initializes the
 * interval; subsequent refreshes are attempted only during minute 00 UTC.
 */
export declare function createFundingIntervalCallback(callback: (data: FundingData) => void, fetchInterval: boolean, fetcher: FundingIntervalFetcher, isActive?: () => boolean): (data: FundingData) => void;
//# sourceMappingURL=fundingInterval.d.ts.map