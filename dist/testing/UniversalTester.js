import { ExchangeTester } from './ExchangeTester.js';
import BinanceFutures from '../binance/BinanceFutures.js';
import BinanceSpot from '../binance/BinanceSpot.js';
import BybitFutures from '../bybit/BybitFutures.js';
import BybitSpot from '../bybit/BybitSpot.js';
import OkxFutures from '../okx/OkxFutures.js';
import OkxSpot from '../okx/OkxSpot.js';
// import KrakenFutures from '../archive/kraken/KrakenFutures.js';
// import KrakenSpot from '../archive/kraken/KrakenSpot.js';
import BitgetFutures from '../bitget/BitgetFutures.js';
import BitgetSpot from '../bitget/BitgetSpot.js';
/**
 * UniversalTester
 *
 * A unified runner for testing multiple exchanges with standard industry practices.
 * Supports configuration-based setup and selective test execution.
 */
export class UniversalTester {
    testers = [];
    /**
     * Register one or more exchanges to be tested.
     * @param configs List of exchange configurations
     */
    registerExchanges(configs) {
        for (const config of configs) {
            try {
                const client = this.createClient(config);
                const name = config.name || config.type;
                const symbol = config.testSymbol || 'BTCUSDT';
                const tester = new ExchangeTester(client, name, symbol);
                this.testers.push(tester);
                console.log(`[UniversalTester] Registered: ${name}`);
            }
            catch (error) {
                console.error(`[UniversalTester] Failed to register exchange ${config.type}:`, error);
            }
        }
    }
    /**
     * Factory method to instantiate specific exchange clients.
     */
    createClient(config) {
        const { type, apiKey, apiSecret, apiPassphrase, isTest } = config;
        switch (type) {
            case 'binance_futures':
                return new BinanceFutures(apiKey, apiSecret, isTest);
            case 'binance_spot':
                return new BinanceSpot(apiKey, apiSecret, isTest);
            case 'bybit_futures':
                return new BybitFutures(apiKey, apiSecret, isTest);
            case 'bybit_spot':
                return new BybitSpot(apiKey, apiSecret, isTest);
            case 'okx_futures':
                return new OkxFutures(apiKey, apiSecret, apiPassphrase, isTest);
            case 'okx_spot':
                return new OkxSpot(apiKey, apiSecret, apiPassphrase, isTest);
            // case 'kraken_futures':
            //     return new KrakenFutures(apiKey, apiSecret, isTest);
            // case 'kraken_spot':
            //     return new KrakenSpot(apiKey, apiSecret, isTest);
            case 'bitget_futures':
                return new BitgetFutures(apiKey, apiSecret, apiPassphrase, isTest);
            case 'bitget_spot':
                return new BitgetSpot(apiKey, apiSecret, apiPassphrase, isTest);
            default:
                throw new Error(`Unsupported exchange type: ${type}`);
        }
    }
    /**
     * Run the configured tests on all registered exchanges.
     * @param config Test execution flags
     */
    async run(config) {
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
