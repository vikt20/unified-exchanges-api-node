import { IUnifiedExchange } from './IUnifiedExchange.js';
import BinanceSpot from '../binance/BinanceSpot.js';
import BinanceFutures from '../binance/BinanceFutures.js';
import BinanceStreams from '../binance/BinanceStreams.js';
import BinanceUserData from '../binance/BinanceUserData.js';

export class ExchangeConnection {
    private apiKey?: string;
    private apiSecret?: string;
    private exchangeId: string;

    constructor(exchangeId: string, apiKey?: string, apiSecret?: string) {
        this.exchangeId = exchangeId;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;

        return this.createConnection() as any;
    }

    private createConnection(): IUnifiedExchange {
        switch (this.exchangeId.toLowerCase()) {
            case 'binance':
                const connection: IUnifiedExchange = {
                    spot: new BinanceSpot(this.apiKey, this.apiSecret),
                    futures: new BinanceFutures(this.apiKey, this.apiSecret),
                    streams: new BinanceStreams(this.apiKey, this.apiSecret),
                };

                if (this.apiKey && this.apiSecret) {
                    connection.userData = new BinanceUserData(this.apiKey, this.apiSecret);
                }

                return connection;
            default:
                throw new Error(`Exchange '${this.exchangeId}' is not supported.`);
        }
    }
}
