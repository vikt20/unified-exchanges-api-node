
import dotenv from 'dotenv';
import { UniversalTester, ExchangeConfig } from './testing/UniversalTester.js';

// Load environment variables
dotenv.config();

interface TestConfig {
    exchanges: string[]; // Array of exchanges to test: ['binance', 'bybit'] or ['all']
    target: {
        spot: boolean;
        futures: boolean;
    };
    mode: {
        public: boolean;
        authenticated: boolean;
    };
}

/**
 * Main Test Runner
 * 
 * Configures and executes tests using the UniversalTester class based on the provided configuration.
 */
async function main(config: TestConfig) {
    // 1. Instantiate the Universal Tester
    const tester = new UniversalTester();
    const exchangeConfigs: ExchangeConfig[] = [];

    const selectedExchanges = config.exchanges.map(e => e.toLowerCase());
    const runBinance = selectedExchanges.includes('all') || selectedExchanges.includes('binance');
    const runBybit = selectedExchanges.includes('all') || selectedExchanges.includes('bybit');

    console.log(`\n[Test Runner] Configuration: Exchanges=[${runBinance ? 'BINANCE' : ''} ${runBybit ? 'BYBIT' : ''}] | Targets=[${config.target.spot ? 'SPOT' : ''} ${config.target.futures ? 'FUTURES' : ''}] | Modes=[${config.mode.public ? 'PUBLIC' : ''} ${config.mode.authenticated ? 'AUTH' : ''}]`);

    // ─────────────────────────────────────────────────────────────────
    // FUTURES EXCHANGES
    // ─────────────────────────────────────────────────────────────────
    if (config.target.futures) {
        // Binance Futures (Testnet)
        if (runBinance) {
            if (process.env.BINANCE_TESTNET_API_KEY_FUTURES && process.env.BINANCE_TESTNET_API_SECRET_FUTURES) {
                exchangeConfigs.push({
                    type: 'binance_futures',
                    name: 'Binance Futures (TESTNET)',
                    apiKey: process.env.BINANCE_TESTNET_API_KEY_FUTURES,
                    apiSecret: process.env.BINANCE_TESTNET_API_SECRET_FUTURES,
                    isTest: true,
                    testSymbol: 'BTCUSDT'
                });
            } else {
                console.log('[SKIP] Binance Futures Testnet: Credentials not found (BINANCE_TESTNET_API_KEY_FUTURES)');
            }
        }

        // Bybit Futures (Testnet)
        if (runBybit) {
            if (process.env.BYBIT_TESTNET_API_KEY && process.env.BYBIT_TESTNET_API_SECRET) {
                exchangeConfigs.push({
                    type: 'bybit_futures',
                    name: 'Bybit Futures (TESTNET)',
                    apiKey: process.env.BYBIT_TESTNET_API_KEY,
                    apiSecret: process.env.BYBIT_TESTNET_API_SECRET,
                    isTest: true,
                    testSymbol: 'BTCUSDT'
                });
            } else {
                console.log('[SKIP] Bybit Futures Testnet: Credentials not found (BYBIT_TESTNET_API_KEY)');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // SPOT EXCHANGES
    // ─────────────────────────────────────────────────────────────────
    if (config.target.spot) {
        // Binance Spot (Testnet)
        if (runBinance) {
            if (process.env.BINANCE_TESTNET_API_KEY_SPOT && process.env.BINANCE_TESTNET_API_SECRET_SPOT) {
                exchangeConfigs.push({
                    type: 'binance_spot',
                    name: 'Binance Spot (TESTNET)',
                    apiKey: process.env.BINANCE_TESTNET_API_KEY_SPOT,
                    apiSecret: process.env.BINANCE_TESTNET_API_SECRET_SPOT,
                    isTest: true,
                    testSymbol: 'BTCUSDT'
                });
            } else {
                console.log('[SKIP] Binance Spot Testnet: Credentials not found (BINANCE_TESTNET_API_KEY_SPOT)');
            }
        }

        // Bybit Spot (Testnet)
        if (runBybit) {
            if (process.env.BYBIT_TESTNET_API_KEY && process.env.BYBIT_TESTNET_API_SECRET) {
                exchangeConfigs.push({
                    type: 'bybit_spot',
                    name: 'Bybit Spot (TESTNET)',
                    apiKey: process.env.BYBIT_TESTNET_API_KEY,
                    apiSecret: process.env.BYBIT_TESTNET_API_SECRET,
                    isTest: true,
                    testSymbol: 'BTCUSDT'
                });
            }
        }
    }

    // 3. Register Exchanges
    if (exchangeConfigs.length === 0) {
        console.warn('[WARN] No exchanges configured to run. Check .env variables or config settings.');
        return;
    }

    tester.registerExchanges(exchangeConfigs);

    // 4. Run Tests
    await tester.run({
        runPublic: config.mode.public,
        runAuthenticated: config.mode.authenticated
    });
}

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────
const RUN_CONFIG: TestConfig = {
    exchanges: [
        'binance',
        'bybit'
    ], // Options: 'binance', 'bybit', or ['all']
    target: {
        spot: false,      // Set to true to test Spot
        futures: true,    // Set to true to test Futures
    },
    mode: {
        public: true,     // Set to true to test Public Data
        authenticated: false // Set to true to test Order Flow/Private Data
    }
};

// Execute
main(RUN_CONFIG).catch(error => {
    console.error('Test Execution Failed:', error);
});
