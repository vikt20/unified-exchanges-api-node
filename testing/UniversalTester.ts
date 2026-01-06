
import { IExchangeClient } from '../core/IExchangeClient.js';
import { ExchangeTester } from './ExchangeTester.js';
import BinanceFutures from '../binance/BinanceFutures.js';
import BinanceSpot from '../binance/BinanceSpot.js';
import BybitFutures from '../bybit/BybitFutures.js';
import BybitSpot from '../bybit/BybitSpot.js';

export type ExchangeType = 'binance_futures' | 'binance_spot' | 'bybit_futures' | 'bybit_spot';

export interface ExchangeConfig {
    type: ExchangeType;
    name?: string;
    apiKey?: string;
    apiSecret?: string;
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
export class UniversalTester {
    private testers: ExchangeTester[] = [];

    /**
     * Register one or more exchanges to be tested.
     * @param configs List of exchange configurations
     */
    public registerExchanges(configs: ExchangeConfig[]) {
        for (const config of configs) {
            try {
                const client = this.createClient(config);
                const name = config.name || config.type;
                const symbol = config.testSymbol || 'BTCUSDT';
                const tester = new ExchangeTester(client, name, symbol);
                this.testers.push(tester);
                console.log(`[UniversalTester] Registered: ${name}`);
            } catch (error) {
                console.error(`[UniversalTester] Failed to register exchange ${config.type}:`, error);
            }
        }
    }

    /**
     * Factory method to instantiate specific exchange clients.
     */
    private createClient(config: ExchangeConfig): IExchangeClient {
        const { type, apiKey, apiSecret, isTest } = config;
        switch (type) {
            case 'binance_futures':
                return new BinanceFutures(apiKey, apiSecret, isTest);
            case 'binance_spot':
                return new BinanceSpot(apiKey, apiSecret, isTest);
            case 'bybit_futures':
                return new BybitFutures(apiKey, apiSecret, isTest);
            case 'bybit_spot':
                return new BybitSpot(apiKey, apiSecret, isTest);
            default:
                throw new Error(`Unsupported exchange type: ${type}`);
        }
    }

    /**
     * Run the configured tests on all registered exchanges.
     * @param config Test execution flags
     */
    public async run(config: TesterRunConfig) {
        console.log("╔══════════════════════════════════════════════════════════════╗");
        console.log("║    UNIFIED EXCHANGE API - UNIVERSAL VERIFICATION SUITE       ║");
        console.log("╚══════════════════════════════════════════════════════════════╝");

        if (this.testers.length === 0) {
            console.warn("\n[WARN] No exchanges registered. Please check your configuration.");
            return;
        }

        if (config.runPublic) {
            console.log("\n>>> RUNNING PUBLIC DATA TESTS <<<\n");
            for (const tester of this.testers) {
                await tester.runAllTests();
            }
        }

        if (config.runAuthenticated) {
            console.log("\n>>> RUNNING AUTHENTICATED TESTS <<<\n");
            for (const tester of this.testers) {
                await tester.runAuthenticatedTests();
            }
        }

        console.log("\n╔════════════════════════════════════════════════════╗");
        console.log("║              ALL TESTS COMPLETE                    ║");
        console.log("╚════════════════════════════════════════════════════╝\n");
    }
}
