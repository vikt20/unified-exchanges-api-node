"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BybitUserData = exports.BybitStreams = exports.BybitFutures = exports.BybitSpot = exports.BybitBase = exports.BinanceUserData = exports.BinanceStreams = exports.BinanceFutures = exports.BinanceSpot = exports.BinanceBase = exports.ExchangeFactory = void 0;
const BinanceBase_js_1 = __importDefault(require("../binance/BinanceBase.js"));
exports.BinanceBase = BinanceBase_js_1.default;
const BinanceSpot_js_1 = __importDefault(require("../binance/BinanceSpot.js"));
exports.BinanceSpot = BinanceSpot_js_1.default;
const BinanceFutures_js_1 = __importDefault(require("../binance/BinanceFutures.js"));
exports.BinanceFutures = BinanceFutures_js_1.default;
const BinanceStreams_js_1 = __importDefault(require("../binance/BinanceStreams.js"));
exports.BinanceStreams = BinanceStreams_js_1.default;
const BinanceUserData_js_1 = __importDefault(require("../binance/BinanceUserData.js"));
exports.BinanceUserData = BinanceUserData_js_1.default;
const BybitSpot_js_1 = __importDefault(require("../bybit/BybitSpot.js"));
exports.BybitSpot = BybitSpot_js_1.default;
const BybitFutures_js_1 = __importDefault(require("../bybit/BybitFutures.js"));
exports.BybitFutures = BybitFutures_js_1.default;
const BybitStreams_js_1 = __importDefault(require("../bybit/BybitStreams.js"));
exports.BybitStreams = BybitStreams_js_1.default;
const BybitUserData_js_1 = __importDefault(require("../bybit/BybitUserData.js"));
exports.BybitUserData = BybitUserData_js_1.default;
const BybitBase_js_1 = __importDefault(require("../bybit/BybitBase.js"));
exports.BybitBase = BybitBase_js_1.default;
const types_js_1 = require("./types.js");
class ExchangeFactory {
    static create(exchangeId, apiKey, apiSecret) {
        switch (exchangeId) {
            case types_js_1.ExchangeList.BINANCE:
                const connection = {
                    spot: new BinanceSpot_js_1.default(apiKey, apiSecret),
                    futures: new BinanceFutures_js_1.default(apiKey, apiSecret),
                    streams: new BinanceStreams_js_1.default(apiKey, apiSecret),
                };
                if (apiKey && apiSecret) {
                    connection.userData = new BinanceUserData_js_1.default(apiKey, apiSecret);
                }
                return connection;
            case types_js_1.ExchangeList.BYBIT:
                const connectionBybit = {
                    spot: new BybitSpot_js_1.default(apiKey, apiSecret),
                    futures: new BybitFutures_js_1.default(apiKey, apiSecret),
                    streams: new BybitStreams_js_1.default(apiKey, apiSecret),
                };
                if (apiKey && apiSecret) {
                    connectionBybit.userData = new BybitUserData_js_1.default(apiKey, apiSecret);
                }
                return connectionBybit;
            default:
                throw new Error(`Exchange '${exchangeId}' is not supported.`);
        }
    }
}
exports.ExchangeFactory = ExchangeFactory;
