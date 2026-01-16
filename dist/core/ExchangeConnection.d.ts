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
export declare class ExchangeFactory {
    static create(exchangeId: string, apiKey?: string, apiSecret?: string): IUnifiedExchange;
}
export { BinanceBase, BinanceSpot, BinanceFutures, BinanceStreams, BinanceUserData, BybitBase, BybitSpot, BybitFutures, BybitStreams, BybitUserData };
//# sourceMappingURL=ExchangeConnection.d.ts.map