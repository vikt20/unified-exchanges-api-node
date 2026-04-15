import { ExchangeFactory, BinanceUserData, BybitUserData, ExchangeList, ExtractedInfo } from 'unified-exchanges-api-node';
import dotenv from 'dotenv';
import { OkxFutures } from 'unified-exchanges-api-node';
// Load environment variables
dotenv.config({
    path: '../.env'
});

console.log(process.env.OKX_API_KEY, process.env.OKX_API_SECRET, process.env.OKX_TESTNET_PASSPHRASE);
console.log(`starting okx futures instance...`)
const okxFutures = new OkxFutures();

const info = await okxFutures.getExchangeInfo().then(request => request.success && request.data ? Object.values(request.data) : [] );

// const bybitApi = ExchangeFactory.create('BYBIT', process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET);
// const binanceApi = ExchangeFactory.create('BINANCE');

console.log(`starting okx api instance...`)
const okxApi = ExchangeFactory.create(ExchangeList.OKX, process.env.OKX_API_KEY, process.env.OKX_API_SECRET, process.env.OKX_TESTNET_PASSPHRASE, false, { exchangeInfoFutures: info });

// api.spot.signedRequest('spot', 'GET', '/v5/order/spot-borrow-check', { category: 'spot', symbol: 'ETHUSDT', side: 'Sell' }).then(console.log);

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

async function getSpotSymbols(api: any): Promise<Set<string>> {
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

// okxApi.futures.getLatestPnlBySymbol("ZEC-USDT-SWAP").then(console.log);
// okxApi.futures.getBalance().then(console.log);

// okxApi.futures.getStaticDepth({ symbol: "ADA-USDT-SWAP", limit: 400 }).then(console.log);
console.log(`fetching okx open positions...`)
setTimeout(() => okxApi.futures.getOpenPositions().then(console.log), 30)
setTimeout(() => okxApi.futures.getOpenPositions().then(console.log), 3000)


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

