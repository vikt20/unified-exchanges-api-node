import { UniversalTester, ExchangeConfig } from './UniversalTester.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTests() {
    const tester = new UniversalTester();

    const configs: ExchangeConfig[] = [
        {
            type: 'okx_futures',
            name: 'OKX V5 Futures',
            testSymbol: 'BTC-USDT-SWAP', // OKX swap format
            isTest: false // Testing with public endpoints first
        }
        // OKX spot format example: BTC-USDT
    ];

    tester.registerExchanges(configs);

    console.log("\nStarting OKX tests...");

    // We only run public tests first to see if streams, market data works
    await tester.run({
        runPublic: true,
        runAuthenticated: false
    });

    console.log("\nTest suite finished.");
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
