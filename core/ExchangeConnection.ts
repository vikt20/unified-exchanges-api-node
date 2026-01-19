import { IUnifiedExchange } from './IUnifiedExchange.js';

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


export class ExchangeFactory {
    static create(exchangeId: ExchangeList, apiKey?: string, apiSecret?: string): IUnifiedExchange {
        switch (exchangeId) {

            case ExchangeList.BINANCE:
                const connection: IUnifiedExchange = {
                    spot: new BinanceSpot(apiKey, apiSecret),
                    futures: new BinanceFutures(apiKey, apiSecret),
                    streams: new BinanceStreams(apiKey, apiSecret),
                };
                if (apiKey && apiSecret) {
                    connection.userData = new BinanceUserData(apiKey, apiSecret);
                }
                return connection;

            case ExchangeList.BYBIT:
                const connectionBybit: IUnifiedExchange = {
                    spot: new BybitSpot(apiKey, apiSecret),
                    futures: new BybitFutures(apiKey, apiSecret),
                    streams: new BybitStreams(apiKey, apiSecret),
                };
                if (apiKey && apiSecret) {
                    connectionBybit.userData = new BybitUserData(apiKey, apiSecret);
                }
                return connectionBybit;

            default:
                throw new Error(`Exchange '${exchangeId}' is not supported.`);
        }
    }
}

export {
    BinanceBase,
    BinanceSpot,
    BinanceFutures,
    BinanceStreams,
    BinanceUserData,

    BybitBase,
    BybitSpot,
    BybitFutures,
    BybitStreams,
    BybitUserData
};