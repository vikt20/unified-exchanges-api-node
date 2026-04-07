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
export declare class ExchangeFactory {
    static create(exchangeId: ExchangeList, apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTestnet?: boolean, connectionOptions?: ExchangeConnectionOptions): IUnifiedExchange;
}
export { BinanceBase, BinanceSpot, BinanceFutures, BinanceStreams, BinanceWebsocketApiClient, BinanceUserData, BybitBase, BybitSpot, BybitFutures, BybitStreams, BybitUserData, OkxBase, OkxSpot, OkxFutures, OkxStreams };
//# sourceMappingURL=ExchangeConnection.d.ts.map