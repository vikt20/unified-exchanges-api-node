"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BybitBase_js_1 = __importDefault(require("./BybitBase.js"));
const ws_1 = __importDefault(require("ws"));
const converters_js_1 = require("./converters.js");
// Extend BybitBase to get access to API keys and Base URLs
class BybitStreams extends BybitBase_js_1.default {
    subscriptions = [];
    constructor(apiKey, apiSecret, isTest = false) {
        super(apiKey, apiSecret, isTest);
    }
    // --- Base WebSocket Handler ---
    handleWebSocket(url, topics, callback, parser, title, statusCallback, auth = false) {
        const RECONNECT_DELAY = 3000;
        const PING_INTERVAL = 20000; // Bybit needs ping every 20s
        const id = Math.random().toString(36).substring(7);
        let isActive = true;
        let currentWs = null;
        let reconnectTimeout = null;
        let pingInterval = null;
        const cleanup = () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (pingInterval) {
                clearInterval(pingInterval);
                pingInterval = null;
            }
            if (currentWs) {
                currentWs.removeAllListeners();
                currentWs.terminate();
                currentWs = null;
            }
        };
        const disconnect = () => {
            isActive = false;
            cleanup();
        };
        this.subscriptions.push({ id, disconnect });
        return new Promise((resolve, reject) => {
            let isInitialConnection = true;
            const connect = () => {
                if (!isActive)
                    return;
                cleanup();
                try {
                    currentWs = new ws_1.default(url);
                }
                catch (e) {
                    console.error(`${title} - Failed to create WebSocket`, e);
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        reject(e);
                    }
                    else {
                        reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                    }
                    return;
                }
                currentWs.on('open', () => {
                    statusCallback?.('OPEN');
                    if (auth && this.apiKey && this.apiSecret) {
                        const expires = Date.now() + 10000;
                        const signature = this.generateHmacSignature(expires);
                        const authParams = {
                            op: 'auth',
                            args: [this.apiKey, expires, signature]
                        };
                        currentWs?.send(JSON.stringify(authParams));
                    }
                    if (topics.length > 0) {
                        const subParams = {
                            op: 'subscribe',
                            args: topics
                        };
                        currentWs?.send(JSON.stringify(subParams));
                    }
                    pingInterval = setInterval(() => {
                        if (currentWs?.readyState === ws_1.default.OPEN) {
                            currentWs.send(JSON.stringify({ op: "ping" }));
                            statusCallback?.('PING');
                        }
                    }, PING_INTERVAL);
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });
                currentWs.on('message', (data) => {
                    try {
                        const parsed = JSON.parse(data.toString());
                        if (parsed.op === 'pong') {
                            statusCallback?.('PONG');
                            return;
                        }
                        if (parsed.op === 'auth') {
                            if (!parsed.success)
                                console.error(`${title} - Auth Failed: ${parsed.ret_msg}`);
                            return;
                        }
                        if (parsed.op === 'subscribe') {
                            if (!parsed.success)
                                console.error(`${title} - Subscribe Failed: ${parsed.ret_msg}`);
                            return;
                        }
                        if (parsed.topic && parsed.data) {
                            const result = parser(parsed);
                            if (result)
                                callback(result);
                        }
                    }
                    catch (e) {
                        console.error(`${title} - Error parsing message`, e);
                    }
                });
                currentWs.on('close', (code, reason) => {
                    if (!isActive)
                        return;
                    console.log(`${title} - WebSocket closed (code: ${code}), reconnecting...`);
                    statusCallback?.('CLOSE');
                    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                });
                currentWs.on('error', (err) => {
                    console.error(`${title} - WebSocket error`, err);
                    statusCallback?.('ERROR');
                });
            };
            connect();
        });
    }
    generateHmacSignature(expires) {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', this.apiSecret).update(`GET/realtime${expires}`).digest('hex');
    }
    // --- IStreamManager Implementation ---
    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        this.destroy(); // from base
    }
    closeById(id) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }
    // --- Parsers ---
    parseDepth(msg) {
        const data = msg.data;
        if (msg.type === 'snapshot') {
            return {
                symbol: data.s,
                asks: data.a,
                bids: data.b
            };
        }
        return {
            symbol: msg.topic?.split('.')[2] || '',
            asks: data.a,
            bids: data.b
        };
    }
    parseKline(msg) {
        if (Array.isArray(msg.data)) {
            const item = msg.data[0];
            return {
                symbol: msg.topic?.split('.')[2] || '',
                time: item.start,
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume),
                trades: 0
            };
        }
        return undefined;
    }
    parseBookTicker(msg) {
        const data = msg.data;
        return {
            symbol: data.symbol,
            bestBid: parseFloat(data.bid1Price),
            bestBidQty: parseFloat(data.bid1Size),
            bestAsk: parseFloat(data.ask1Price),
            bestAskQty: parseFloat(data.ask1Size)
        };
    }
    parseTrade(msg) {
        if (Array.isArray(msg.data)) {
            const trade = msg.data[0];
            return {
                symbol: trade.s,
                price: parseFloat(trade.p),
                quantity: parseFloat(trade.v),
                tradeTime: trade.T,
                orderType: trade.S === 'Buy' ? 'BUY' : 'SELL'
            };
        }
        return undefined;
    }
    /**
     * Maps Bybit order statuses to unified format (Binance standard)
     * Bybit statuses: Created, New, Rejected, PartiallyFilled, PartiallyFilled (Cancelled), Filled, Cancelled, Untriggered, Triggered, Deactivated
     * Unified statuses: NEW, PARTIALLY_FILLED, FILLED, CANCELED, PENDING_CANCEL, REJECTED, EXPIRED, PENDING, TRIGGERED, FINISHED
     */
    mapBybitOrderStatus(bybitStatus) {
        const statusMap = {
            'Created': 'NEW',
            'New': 'NEW',
            'Untriggered': 'NEW',
            'Rejected': 'REJECTED',
            'PartiallyFilled': 'PARTIALLY_FILLED',
            'Filled': 'FILLED',
            'Cancelled': 'CANCELED',
            'PendingCancel': 'PENDING_CANCEL',
            'Triggered': 'TRIGGERED',
            'Deactivated': 'EXPIRED'
        };
        return statusMap[bybitStatus] || bybitStatus;
    }
    // --- Future Streams (Linear) ---
    futuresDepthStream(symbols, callback, statusCallback, levels) {
        const topics = symbols.map(s => `orderbook.${levels || 50}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseDepth, 'futuresDepthStream', statusCallback);
    }
    futuresCandleStickStream(symbols, interval, callback, statusCallback) {
        let bybitInterval = interval.replace('m', '');
        if (interval === '1h')
            bybitInterval = '60';
        if (interval === '4h')
            bybitInterval = '240';
        if (interval === '1d')
            bybitInterval = 'D';
        const topics = symbols.map(s => `kline.${bybitInterval}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseKline, 'futuresCandleStickStream', statusCallback);
    }
    futuresBookTickerStream(symbols, callback, statusCallback) {
        const topics = symbols.map(s => `tickers.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseBookTicker, 'futuresBookTickerStream', statusCallback);
    }
    futuresTradeStream(symbols, callback, statusCallback) {
        const topics = symbols.map(s => `publicTrade.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseTrade, 'futuresTradeStream', statusCallback);
    }
    async futuresUserDataStream(callback, statusCallback) {
        const topics = ['execution', 'order', 'position', 'wallet'];
        return this.handleWebSocket(this.getStreamUrl('private'), topics, callback, (msg) => {
            const topic = msg.topic;
            const dataList = msg.data;
            if (topic === 'position') {
                const positions = dataList.map((p) => {
                    let dir = 'LONG';
                    if (p.side === 'Sell' || p.positionIdx === 2)
                        dir = 'SHORT';
                    return {
                        symbol: p.symbol,
                        positionAmount: parseFloat(p.size),
                        entryPrice: parseFloat(p.avgPrice || p.entryPrice || '0'),
                        positionDirection: dir,
                        isInPosition: parseFloat(p.size) > 0,
                        unrealizedPnL: parseFloat(p.unrealisedPnl || '0')
                    };
                });
                return {
                    event: 'ACCOUNT_UPDATE',
                    accountData: { balances: undefined, positions: positions },
                    orderData: undefined
                };
            }
            if (topic === 'order') {
                // console.log(`RAW BYBIT ORDER:`, dataList[0]);
                const o = dataList[0];
                // Handle Bybit's special case: order may show as "Filled" but actually was cancelled
                // Bybit v5 API: "You may receive two orderStatus=Filled messages when the cancel request
                // is accepted but the order is executed at the same time. Generally, one message contains
                // orderStatus=Filled, rejectReason=EC_NoError, and another message contains
                // orderStatus=Filled, cancelType=CancelByUser, rejectReason=EC_OrigClOrdIDDoesNotExist.
                // The first message tells you the order is executed, and the second message tells you
                // the followed cancel request is rejected due to order is executed."
                let orderStatus = o.orderStatus;
                // If order status is "Filled" but cancelType indicates cancellation, treat it as CANCELED
                if (o.orderStatus === 'Filled' && o.cancelType && o.cancelType !== 'UNKNOWN') {
                    // Check if this is actually a cancellation (not an execution)
                    // CancelType can be: CancelByUser, CancelByReduceOnly, CancelByPrepareLiq, CancelAllBeforeLiq, etc.
                    // If rejectReason is EC_OrigClOrdIDDoesNotExist or similar, and cancelType is set,
                    // this is the cancellation message, not the execution
                    if (o.rejectReason && o.rejectReason !== 'EC_NoError') {
                        orderStatus = 'CANCELED'; // Map to Bybit's "Cancelled" which we'll convert to "CANCELED"
                    }
                }
                // Map Bybit order statuses to unified format (Binance standard)
                const unifiedOrderStatus = this.mapBybitOrderStatus(orderStatus);
                const orderData = {
                    symbol: o.symbol,
                    clientOrderId: o.orderLinkId || o.orderId,
                    side: o.side.toUpperCase(),
                    orderType: (0, converters_js_1.mapBybitOrderType)(o),
                    timeInForce: (o.timeInForce === 'PostOnly' ? 'GTX' : o.timeInForce),
                    originalQuantity: parseFloat(o.qty),
                    originalPrice: parseFloat(o.price || '0'),
                    averagePrice: parseFloat(o.avgPrice || '0'),
                    stopPrice: parseFloat(o.triggerPrice || '0'),
                    executionType: unifiedOrderStatus,
                    orderStatus: unifiedOrderStatus,
                    orderId: o.orderId,
                    orderLastFilledQuantity: parseFloat(o.lastExecQty || '0'),
                    orderFilledAccumulatedQuantity: parseFloat(o.cumExecQty || '0'),
                    lastFilledPrice: parseFloat(o.avgPrice || '0'),
                    commissionAsset: '',
                    commission: o.cumExecFee || '0',
                    orderTradeTime: parseInt(o.updatedTime),
                    tradeId: 0,
                    isMakerSide: false,
                    isReduceOnly: o.reduceOnly,
                    workingType: (0, converters_js_1.mapBybitTriggerBy)(o.triggerBy),
                    originalOrderType: (0, converters_js_1.mapBybitOrderType)(o),
                    positionSide: o.positionIdx === 1 ? 'LONG' : (o.positionIdx === 2 ? 'SHORT' : 'BOTH'),
                    closeAll: o.closeOnTrigger || false,
                    activationPrice: o.triggerPrice,
                    callbackRate: '',
                    realizedProfit: '',
                    isAlgoOrder: false
                };
                return {
                    event: 'ORDER_TRADE_UPDATE',
                    orderData: orderData,
                    accountData: undefined
                };
            }
            if (topic === 'wallet') {
                const balances = [];
                // Bybit V5 wallet stream structure: data is array of accounts, each has 'coin' array
                if (Array.isArray(dataList)) {
                    dataList.forEach((account) => {
                        if (Array.isArray(account.coin)) {
                            account.coin.forEach((c) => {
                                balances.push({
                                    asset: c.coin,
                                    balance: c.walletBalance || '0',
                                    crossWalletBalance: c.equity || '0',
                                    balanceChange: '0'
                                });
                            });
                        }
                    });
                }
                return {
                    event: 'ACCOUNT_UPDATE',
                    accountData: { balances: balances, positions: undefined },
                    orderData: undefined
                };
            }
            return undefined;
        }, 'futuresUserDataStream', statusCallback, true);
    }
    // --- Spot Streams (Public) ---
    // Bybit V5 Spot Public topics use same structure as Linear
    spotDepthStream(symbols, callback, statusCallback, levels) {
        const topics = symbols.map(s => `orderbook.${levels || 50}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseDepth, 'spotDepthStream', statusCallback);
    }
    spotCandleStickStream(symbols, interval, callback, statusCallback) {
        let bybitInterval = interval.replace('m', '');
        if (interval === '1h')
            bybitInterval = '60';
        if (interval === '4h')
            bybitInterval = '240';
        if (interval === '1d')
            bybitInterval = 'D';
        const topics = symbols.map(s => `kline.${bybitInterval}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseKline, 'spotCandleStickStream', statusCallback);
    }
    spotBookTickerStream(symbols, callback, statusCallback) {
        const topics = symbols.map(s => `tickers.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseBookTicker, 'spotBookTickerStream', statusCallback);
    }
    spotTradeStream(symbols, callback, statusCallback) {
        const topics = symbols.map(s => `publicTrade.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseTrade, 'spotTradeStream', statusCallback);
    }
    parseFunding(msg) {
        const data = msg.data;
        if (data && data.fundingRate && data.nextFundingTime) {
            return (0, converters_js_1.convertBybitFunding)(data);
        }
        return undefined;
    }
    fundingStream(symbols, callback, statusCallback) {
        const topics = symbols.map(s => `tickers.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseFunding, 'fundingStream', statusCallback);
    }
}
exports.default = BybitStreams;
