export type ExchangeType = 'binance_futures' | 'binance_spot' | 'bybit_futures' | 'bybit_spot' | 'okx_futures' | 'okx_spot' | 'kraken_futures' | 'kraken_spot' | 'bitget_futures' | 'bitget_spot';
export interface ExchangeConfig {
    type: ExchangeType;
    name?: string;
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
    isTest?: boolean;
    testSymbol?: string;
}
export interface TesterRunConfig {
    runPublic?: boolean;
    runAuthenticated?: boolean;
}
/**
 * UniversalTester
 *
 * A unified runner for testing multiple exchanges with standard industry practices.
 * Supports configuration-based setup and selective test execution.
 */
export declare class UniversalTester {
    private testers;
    /**
     * Register one or more exchanges to be tested.
     * @param configs List of exchange configurations
     */
    registerExchanges(configs: ExchangeConfig[]): void;
    /**
     * Factory method to instantiate specific exchange clients.
     */
    private createClient;
    /**
     * Run the configured tests on all registered exchanges.
     * @param config Test execution flags
     */
    run(config: TesterRunConfig): Promise<void>;
}
//# sourceMappingURL=UniversalTester.d.ts.map