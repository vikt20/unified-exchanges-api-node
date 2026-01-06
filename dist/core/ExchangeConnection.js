"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeConnection = void 0;
const BinanceSpot_js_1 = __importDefault(require("../binance/BinanceSpot.js"));
const BinanceFutures_js_1 = __importDefault(require("../binance/BinanceFutures.js"));
const BinanceStreams_js_1 = __importDefault(require("../binance/BinanceStreams.js"));
const BinanceUserData_js_1 = __importDefault(require("../binance/BinanceUserData.js"));
class ExchangeConnection {
    apiKey;
    apiSecret;
    exchangeId;
    constructor(exchangeId, apiKey, apiSecret) {
        this.exchangeId = exchangeId;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        return this.createConnection();
    }
    createConnection() {
        switch (this.exchangeId.toLowerCase()) {
            case 'binance':
                const connection = {
                    spot: new BinanceSpot_js_1.default(this.apiKey, this.apiSecret),
                    futures: new BinanceFutures_js_1.default(this.apiKey, this.apiSecret),
                    streams: new BinanceStreams_js_1.default(this.apiKey, this.apiSecret),
                };
                if (this.apiKey && this.apiSecret) {
                    connection.userData = new BinanceUserData_js_1.default(this.apiKey, this.apiSecret);
                }
                return connection;
            default:
                throw new Error(`Exchange '${this.exchangeId}' is not supported.`);
        }
    }
}
exports.ExchangeConnection = ExchangeConnection;
