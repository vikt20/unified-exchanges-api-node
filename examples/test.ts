import { ExchangeFactory, BinanceUserData, BybitUserData } from 'unified-exchanges-api-node';

const api = ExchangeFactory.create('BYBIT', 'KEY', 'SECRET');

async function getFuturesSymbols(): Promise<Set<string>> {
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

// getFuturesSymbols().then(console.log);
// getSpotSymbols().then(console.log);


api.futures.futuresCandleStickStream(["BTCUSDT"], "1m", (data) => {
    console.log(data);
})