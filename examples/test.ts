import { ExchangeFactory, BinanceUserData, BybitUserData } from 'unified-exchanges-api-node';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config({
    path: '../.env'
});

console.log(process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET);

const api = ExchangeFactory.create('BYBIT', process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET);

// async function getFuturesSymbols(): Promise<Set<string>> {
//     const exchangeInfo = await api.futures.getExchangeInfo();
//     const symbols = new Set<string>();
//     if (exchangeInfo.success) {
//         for (const symbol of Object.keys(exchangeInfo.data)) {
//             if (symbol.includes("USDT")) {
//                 symbols.add(symbol);
//             }
//         }
//     } else {
//         return new Set<string>();
//     }
//     return symbols;
// }

// async function getSpotSymbols(): Promise<Set<string>> {
//     const exchangeInfo = await api.spot.getExchangeInfo();
//     const symbols = new Set<string>();
//     if (exchangeInfo.success) {
//         for (const symbol of Object.keys(exchangeInfo.data)) {
//             if (symbol.includes("USDT")) {
//                 symbols.add(symbol);
//             }
//         }
//     } else {
//         return new Set<string>();
//     }
//     return symbols;
// }

// // getFuturesSymbols().then(console.log);
// // getSpotSymbols().then(console.log);


// api.futures.futuresCandleStickStream(["BTCUSDT"], "1m", (data) => {
//     console.log(data);
// })

// api.futures.trailingStopOrder({
//     symbol: "ENSOUSDT",
//     side: "SELL",
//     quantity: 6.3,
//     activatePrice: 1.585,
//     callbackRate: 0.2,
// }).then(console.log);

api.futures.getLatestPnlBySymbol("ENSOUSDT").then(console.log);