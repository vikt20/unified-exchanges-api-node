import { IUnifiedExchange } from './IUnifiedExchange.js';

import BinanceBase from '../binance/BinanceBase.js';
import BinanceSpot from '../binance/BinanceSpot.js';
import BinanceFutures from '../binance/BinanceFutures.js';
import BinanceStreams from '../binance/BinanceStreams.js';
import BinanceUserData from '../binance/BinanceUserData.js';
import { BinanceWebsocketApiClient } from '../binance/BinanceWebsocketApi.js';

import BybitSpot from '../bybit/BybitSpot.js';
import BybitFutures from '../bybit/BybitFutures.js';
import BybitStreams from '../bybit/BybitStreams.js';
import BybitUserData from '../bybit/BybitUserData.js';
import BybitBase from '../bybit/BybitBase.js';
import { ExchangeList } from './types.js';
import type { ExchangeConnectionOptions } from './types.js';

import OkxSpot from '../okx/OkxSpot.js';
import OkxFutures from '../okx/OkxFutures.js';
import OkxStreams from '../okx/OkxStreams.js';
import OkxBase from '../okx/OkxBase.js';
import OkxUserData from '../okx/OkxUserData.js';

import KrakenSpot from '../kraken/KrakenSpot.js';
import KrakenFutures from '../kraken/KrakenFutures.js';
import KrakenStreams from '../kraken/KrakenStreams.js';
import KrakenBase from '../kraken/KrakenBase.js';
import KrakenUserData from '../kraken/KrakenUserData.js';

import BitgetSpot from '../bitget/BitgetSpot.js';
import BitgetFutures from '../bitget/BitgetFutures.js';
import BitgetStreams from '../bitget/BitgetStreams.js';
import BitgetBase from '../bitget/BitgetBase.js';
import BitgetUserData from '../bitget/BitgetUserData.js';

export class ExchangeFactory {
    static create(
        exchangeId: ExchangeList,
        apiKey?: string,
        apiSecret?: string,
        apiPassphrase?: string,
        isTestnet: boolean = false,
        connectionOptions?: ExchangeConnectionOptions
    ): IUnifiedExchange {
        switch (exchangeId) {

            case ExchangeList.BINANCE:
                const connection: IUnifiedExchange = {
                    spot: new BinanceSpot(apiKey, apiSecret, isTestnet),
                    futures: new BinanceFutures(apiKey, apiSecret, isTestnet, connectionOptions?.useWebsocketApi),
                    streams: new BinanceStreams(apiKey, apiSecret, isTestnet),
                };
                if (apiKey && apiSecret) {
                    connection.userData = new BinanceUserData(apiKey, apiSecret);
                }
                return connection;

            case ExchangeList.BYBIT:
                const connectionBybit: IUnifiedExchange = {
                    spot: new BybitSpot(apiKey, apiSecret, isTestnet),
                    futures: new BybitFutures(apiKey, apiSecret, isTestnet),
                    streams: new BybitStreams(apiKey, apiSecret, isTestnet),
                };
                if (apiKey && apiSecret) {
                    connectionBybit.userData = new BybitUserData(apiKey, apiSecret);
                }
                return connectionBybit;

            case ExchangeList.OKX:
                const connectionOkx: IUnifiedExchange = {
                    spot: new OkxSpot(apiKey, apiSecret, apiPassphrase, isTestnet),
                    futures: new OkxFutures(apiKey, apiSecret, apiPassphrase, isTestnet, connectionOptions?.exchangeInfoFutures),
                    streams: new OkxStreams(apiKey, apiSecret, apiPassphrase, isTestnet, connectionOptions?.exchangeInfoFutures),
                };
                if (apiKey && apiSecret && apiPassphrase) {
                    connectionOkx.userData = new OkxUserData(apiKey, apiSecret, apiPassphrase, connectionOptions?.exchangeInfoFutures);
                }
                // UserData is not implemented independently, it is handled via streams
                return connectionOkx;

            case ExchangeList.KRAKEN:
                const connectionKraken: IUnifiedExchange = {
                    spot: new KrakenSpot(apiKey, apiSecret, isTestnet),
                    futures: new KrakenFutures(apiKey, apiSecret, isTestnet),
                    streams: new KrakenStreams(apiKey, apiSecret, isTestnet),
                };
                if (apiKey && apiSecret) {
                    connectionKraken.userData = new KrakenUserData(apiKey, apiSecret, isTestnet);
                }
                return connectionKraken;

            case ExchangeList.BITGET:
                const connectionBitget: IUnifiedExchange = {
                    spot: new BitgetSpot(apiKey, apiSecret, apiPassphrase, isTestnet),
                    futures: new BitgetFutures(apiKey, apiSecret, apiPassphrase, isTestnet),
                    streams: new BitgetStreams(apiKey, apiSecret, apiPassphrase, isTestnet),
                };
                if (apiKey && apiSecret && apiPassphrase) {
                    connectionBitget.userData = new BitgetUserData(apiKey, apiSecret, apiPassphrase, isTestnet);
                }
                return connectionBitget;

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
    BinanceWebsocketApiClient,
    BinanceUserData,

    BybitBase,
    BybitSpot,
    BybitFutures,
    BybitStreams,
    BybitUserData,

    OkxBase,
    OkxSpot,
    OkxFutures,
    OkxStreams,

    KrakenBase,
    KrakenSpot,
    KrakenFutures,
    KrakenStreams,
    KrakenUserData,

    BitgetBase,
    BitgetSpot,
    BitgetFutures,
    BitgetStreams,
    BitgetUserData
};
