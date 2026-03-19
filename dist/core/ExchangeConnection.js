import BinanceBase from '../binance/BinanceBase.js';
import BinanceSpot from '../binance/BinanceSpot.js';
import BinanceFutures from '../binance/BinanceFutures.js';
import BinanceStreams from '../binance/BinanceStreams.js';
import BinanceUserData from '../binance/BinanceUserData.js';
import BybitSpot from '../bybit/BybitSpot.js';
import BybitFutures from '../bybit/BybitFutures.js';
import BybitStreams from '../bybit/BybitStreams.js';
import BybitUserData from '../bybit/BybitUserData.js';
import BybitBase from '../bybit/BybitBase.js';
import { ExchangeList } from './types.js';
import OkxSpot from '../okx/OkxSpot.js';
import OkxFutures from '../okx/OkxFutures.js';
import OkxStreams from '../okx/OkxStreams.js';
import OkxBase from '../okx/OkxBase.js';
import OkxUserData from '../okx/OkxUserData.js';
export class ExchangeFactory {
    static create(exchangeId, apiKey, apiSecret, apiPassphrase, isTestnet = false) {
        switch (exchangeId) {
            case ExchangeList.BINANCE:
                const connection = {
                    spot: new BinanceSpot(apiKey, apiSecret, isTestnet),
                    futures: new BinanceFutures(apiKey, apiSecret, isTestnet),
                    streams: new BinanceStreams(apiKey, apiSecret, isTestnet),
                };
                if (apiKey && apiSecret) {
                    connection.userData = new BinanceUserData(apiKey, apiSecret);
                }
                return connection;
            case ExchangeList.BYBIT:
                const connectionBybit = {
                    spot: new BybitSpot(apiKey, apiSecret, isTestnet),
                    futures: new BybitFutures(apiKey, apiSecret, isTestnet),
                    streams: new BybitStreams(apiKey, apiSecret, isTestnet),
                };
                if (apiKey && apiSecret) {
                    connectionBybit.userData = new BybitUserData(apiKey, apiSecret);
                }
                return connectionBybit;
            case ExchangeList.OKX:
                const connectionOkx = {
                    spot: new OkxSpot(apiKey, apiSecret, apiPassphrase, isTestnet),
                    futures: new OkxFutures(apiKey, apiSecret, apiPassphrase, isTestnet),
                    streams: new OkxStreams(apiKey, apiSecret, apiPassphrase, isTestnet),
                };
                if (apiKey && apiSecret && apiPassphrase) {
                    connectionOkx.userData = new OkxUserData(apiKey, apiSecret, apiPassphrase);
                }
                // UserData is not implemented independently, it is handled via streams
                return connectionOkx;
            default:
                throw new Error(`Exchange '${exchangeId}' is not supported.`);
        }
    }
}
export { BinanceBase, BinanceSpot, BinanceFutures, BinanceStreams, BinanceUserData, BybitBase, BybitSpot, BybitFutures, BybitStreams, BybitUserData, OkxBase, OkxSpot, OkxFutures, OkxStreams };
