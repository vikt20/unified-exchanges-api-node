import { ExchangeFactory, BinanceUserData, BybitUserData } from 'unified-exchanges-api-node';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config({
    path: '../.env'
});

// console.log(process.env.OKX_API_KEY, process.env.OKX_API_SECRET);

const api = ExchangeFactory.create('BYBIT', process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET);
const api2 = ExchangeFactory.create('BINANCE');
const api3 = ExchangeFactory.create('OKX');

api.spot.signedRequest('spot', 'GET', '/v5/order/spot-borrow-check', { category: 'spot', symbol: 'ETHUSDT', side: 'Sell' }).then(console.log);

async function getFuturesSymbols(api: any): Promise<Set<string>> {
    const exchangeInfo = await api.futures.getExchangeInfo();
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
// const getSymbolsBinance = await getFuturesSymbols(api2)
// const getSymbolsBybit = await getFuturesSymbols(api)
// console.log(`Binance: ${Array.from(getSymbolsBinance).filter(s => s.includes("STO"))}`)
// console.log(`Bybit: ${Array.from(getSymbolsBybit).filter(s => s.includes("STO"))}`)
// const getSymbols = ["BTCUSDT"]

//stream funding
// api.streams.fundingStream(getSymbols, (data) => {
//     console.log("Bybit", data);
// })

// api2.streams.fundingStream(getSymbols, (data) => {
//     console.log("Binance", data);
// })

// api3.streams.fundingStream(["BTC-USDT-SWAP"], (data) => {
//     console.log("Okx", data);
// })

// let bestAskBinance: number;
// let bestBidBinance: number;
// let bestAskBybit: number;
// let bestBidBybit: number;

// api.streams.spotBookTickerStream(Array.from(getSymbols), (data) => {
//     bestAskBybit = data.bestAsk;
//     bestBidBybit = data.bestBid;
//     // console.log(data);
// })

// api2.streams.spotBookTickerStream(Array.from(getSymbols), (data) => {
//     bestAskBinance = data.bestAsk;
//     bestBidBinance = data.bestBid;
//     // console.log(data);
// })

setInterval(() => {
    // console.log("Best Ask Binance: ", bestAskBinance);
    // console.log("Best Bid Binance: ", bestBidBinance);
    // console.log("Best Ask Bybit: ", bestAskBybit);
    // console.log("Best Bid Bybit: ", bestBidBybit);
    // console.log("Spread Binance: ", bestAskBinance - bestBidBinance);
    // console.log("Spread Bybit: ", bestAskBybit - bestBidBybit);
    // in percent
    // console.log("Difference: ", (bestAskBinance - bestBidBybit) / bestBidBybit * 100);
    // console.log("Difference: ", (bestBidBinance - bestAskBybit) / bestAskBybit * 100);
}, 1000)
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


// api.futures.futuresCandleStickStream(["BTC-USDT-SWAP"], "1m", (data) => {
//     console.log(data);
// })
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

