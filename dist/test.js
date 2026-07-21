import dotenv from 'dotenv';
import { UniversalTester } from './testing/UniversalTester.js';
// Load environment variables
dotenv.config();
/**
 * Main Test Runner
 *
 * Configures and executes tests using the UniversalTester class based on the provided configuration.
 */
async function main(config) {
    // 1. Instantiate the Universal Tester
    const tester = new UniversalTester();
    const exchangeConfigs = [];
    const selectedExchanges = config.exchanges.map(e => e.toLowerCase());
    const runBinance = selectedExchanges.includes('all') || selectedExchanges.includes('binance');
    const runBybit = selectedExchanges.includes('all') || selectedExchanges.includes('bybit');
    const runOkx = selectedExchanges.includes('all') || selectedExchanges.includes('okx');
    const runKraken = selectedExchanges.includes('all') || selectedExchanges.includes('kraken');
    const runBitget = selectedExchanges.includes('all') || selectedExchanges.includes('bitget');
    console.log(`\n[Test Runner] Configuration: Exchanges=[${runBinance ? 'BINANCE' : ''} ${runBybit ? 'BYBIT' : ''} ${runOkx ? 'OKX' : ''} ${runKraken ? 'KRAKEN' : ''} ${runBitget ? 'BITGET' : ''}] | Targets=[${config.target.spot ? 'SPOT' : ''} ${config.target.futures ? 'FUTURES' : ''}] | Modes=[${config.mode.public ? 'PUBLIC' : ''} ${config.mode.authenticated ? 'AUTH' : ''}]`);
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
            }
            else {
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
            }
            else {
                console.log('[SKIP] Bybit Futures Testnet: Credentials not found (BYBIT_TESTNET_API_KEY)');
            }
        }
        // OKX Futures (Testnet / Simulated)
        if (runOkx) {
            if (process.env.OKX_TESTNET_API_KEY && process.env.OKX_TESTNET_API_SECRET) {
                exchangeConfigs.push({
                    type: 'okx_futures',
                    name: 'OKX Futures (TESTNET)',
                    apiKey: process.env.OKX_TESTNET_API_KEY,
                    apiSecret: process.env.OKX_TESTNET_API_SECRET,
                    apiPassphrase: process.env.OKX_TESTNET_PASSPHRASE,
                    isTest: true,
                    testSymbol: 'BTC-USDT-SWAP'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'okx_futures',
                    name: 'OKX Futures (TESTNET - PUBLIC ONLY)',
                    isTest: true,
                    testSymbol: 'BTC-USDT-SWAP'
                });
            }
            else {
                console.log('[SKIP] OKX Futures Testnet: Credentials not found (OKX_TESTNET_API_KEY)');
            }
        }
        // Kraken Futures (Demo/Testnet)
        if (runKraken) {
            if (process.env.KRAKEN_TESTNET_API_KEY && process.env.KRAKEN_TESTNET_API_SECRET) {
                exchangeConfigs.push({
                    type: 'kraken_futures',
                    name: 'Kraken Futures (TESTNET)',
                    apiKey: process.env.KRAKEN_TESTNET_API_KEY,
                    apiSecret: process.env.KRAKEN_TESTNET_API_SECRET,
                    isTest: true,
                    testSymbol: 'PI_XBTUSD'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'kraken_futures',
                    name: 'Kraken Futures (TESTNET - PUBLIC ONLY)',
                    isTest: true,
                    testSymbol: 'PI_XBTUSD'
                });
            }
            else {
                console.log('[SKIP] Kraken Futures Testnet: Credentials not found (KRAKEN_TESTNET_API_KEY)');
            }
        }
        // Bitget Futures (LIVE API; public tests do not need credentials)
        if (runBitget) {
            if (process.env.BITGET_API_KEY && process.env.BITGET_API_SECRET && process.env.BITGET_API_PASSPHRASE) {
                exchangeConfigs.push({
                    type: 'bitget_futures',
                    name: 'Bitget Futures (LIVE)',
                    apiKey: process.env.BITGET_API_KEY,
                    apiSecret: process.env.BITGET_API_SECRET,
                    apiPassphrase: process.env.BITGET_API_PASSPHRASE,
                    isTest: false,
                    testSymbol: 'BTCUSDT'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'bitget_futures',
                    name: 'Bitget Futures (PUBLIC ONLY)',
                    isTest: false,
                    testSymbol: 'BTCUSDT'
                });
            }
            else {
                console.log('[SKIP] Bitget Futures: Credentials not found (BITGET_API_KEY, BITGET_API_SECRET, BITGET_API_PASSPHRASE)');
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
            }
            else {
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
            else {
                console.log('[SKIP] Bybit Spot Testnet: Credentials not found (BYBIT_TESTNET_API_KEY)');
            }
        }
        // OKX Spot (Testnet / Simulated)
        if (runOkx) {
            if (process.env.OKX_TESTNET_API_KEY && process.env.OKX_TESTNET_API_SECRET) {
                exchangeConfigs.push({
                    type: 'okx_spot',
                    name: 'OKX Spot (TESTNET)',
                    apiKey: process.env.OKX_TESTNET_API_KEY,
                    apiSecret: process.env.OKX_TESTNET_API_SECRET,
                    apiPassphrase: process.env.OKX_TESTNET_PASSPHRASE,
                    isTest: true,
                    testSymbol: 'BTC-USDT'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'okx_spot',
                    name: 'OKX Spot (TESTNET - PUBLIC ONLY)',
                    isTest: true,
                    testSymbol: 'BTC-USDT'
                });
            }
            else {
                console.log('[SKIP] OKX Spot Testnet: Credentials not found (OKX_TESTNET_API_KEY)');
            }
        }
        // Kraken Spot has no sandbox; authenticated tests use live credentials.
        if (runKraken) {
            if (process.env.KRAKEN_API_KEY && process.env.KRAKEN_API_SECRET) {
                exchangeConfigs.push({
                    type: 'kraken_spot',
                    name: 'Kraken Spot (LIVE)',
                    apiKey: process.env.KRAKEN_API_KEY,
                    apiSecret: process.env.KRAKEN_API_SECRET,
                    isTest: false,
                    testSymbol: 'XBTUSD'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'kraken_spot',
                    name: 'Kraken Spot (PUBLIC ONLY)',
                    isTest: false,
                    testSymbol: 'XBTUSD'
                });
            }
            else {
                console.log('[SKIP] Kraken Spot: Credentials not found (KRAKEN_API_KEY)');
            }
        }
        // Bitget Spot (LIVE API; public tests do not need credentials)
        if (runBitget) {
            if (process.env.BITGET_API_KEY && process.env.BITGET_API_SECRET && process.env.BITGET_API_PASSPHRASE) {
                exchangeConfigs.push({
                    type: 'bitget_spot',
                    name: 'Bitget Spot (LIVE)',
                    apiKey: process.env.BITGET_API_KEY,
                    apiSecret: process.env.BITGET_API_SECRET,
                    apiPassphrase: process.env.BITGET_API_PASSPHRASE,
                    isTest: false,
                    testSymbol: 'BTCUSDT'
                });
            }
            else if (config.mode.public) {
                exchangeConfigs.push({
                    type: 'bitget_spot',
                    name: 'Bitget Spot (PUBLIC ONLY)',
                    isTest: false,
                    testSymbol: 'BTCUSDT'
                });
            }
            else {
                console.log('[SKIP] Bitget Spot: Credentials not found (BITGET_API_KEY, BITGET_API_SECRET, BITGET_API_PASSPHRASE)');
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
const RUN_CONFIG = {
    exchanges: [
        'okx',
        'bitget',
        'binance',
        'bybit',
    ], // Options: 'binance', 'bybit', 'okx', 'kraken', 'bitget' or ['all']
    target: {
        spot: false, // Set to true to test Spot
        futures: true, // Set to true to test Futures
    },
    mode: {
        public: false, // Set to true to test Public Data
        authenticated: true // Set to true to test Order Flow/Private Data (Set to true when you have added OKX keys to .env)
    }
};
// Execute
main(RUN_CONFIG).catch(error => {
    console.error('Test Execution Failed:', error);
});
