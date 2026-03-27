import { ExchangeFactory, BinanceUserData, BybitUserData } from 'unified-exchanges-api-node';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config({
    path: '../.env'
});

// console.log(process.env.OKX_API_KEY, process.env.OKX_API_SECRET);

const api = ExchangeFactory.create('OKX');

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

async function getSpotSymbols(): Promise<Set<string>> {
    const exchangeInfo = await api.spot.getExchangeInfo();
    const symbols = new Set<string>();
    if (exchangeInfo.success) {
        for (const symbol of Object.keys(exchangeInfo.data)) {
            if (symbol.includes("USDT")) {
                symbols.add(symbol);
            }
        }
    } else {
        return new Set<string>();
    }
    return symbols;
}

// // getFuturesSymbols().then(console.log);
// getSpotSymbols().then(console.log);
// const getSymbols = await getSpotSymbols()
// const symbolsDataReceieved = new Set<string>();
// api.streams.spotDepthStream(Array.from(getSymbols), (data) => {


//     if (!symbolsDataReceieved.has(data.symbol)) {
//         console.log(data.symbol);
//         symbolsDataReceieved.add(data.symbol);
//     }



//     if (symbolsDataReceieved.size === getSymbols.size) {
//         console.log("All symbols data received");
//     }

// })


api.futures.futuresCandleStickStream(["BTC-USDT-SWAP"], "1m", (data) => {
    console.log(data);
})
// await setTimeout(() => {
//     // api.futures.trailingStopOrder({
//     //     symbol: "SOL-USDT-SWAP",
//     //     side: "SELL",
//     //     quantity: 1.1,
//     //     activatePrice: 94.5,
//     //     callbackRate: 0.3,
//     // }).then(console.log);

//     api.futures.cancelOrderById({
//         symbol: "SOL-USDT-SWAP",
//         clientOrderId: "3397690630473154560",
//     }).then(console.log);
// }, 2000)

// api.spot.getStaticDepth({ symbol: "ADA-USDT", limit: 400 }).then(console.log);

// api.streams.futuresDepthStream(["APR-USDT-SWAP"], (data) => {
//     console.log(data);
// }, status => console.log(status))




// api.futures.getLatestPnlBySymbol("ENSOUSDT").then(console.log);
// api.futures.getOpenPositions().then(console.log);
// await api.userData?.init();

// api.userData?.onPositionUpdate((data) => {
//     console.log(data);
// })

// api.userData?.triggerPositionUpdate("ENSOUSDT");

