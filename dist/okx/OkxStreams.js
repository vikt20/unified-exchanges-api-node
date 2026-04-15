import OkxBase from "./OkxBase.js";
import ws from 'ws';
import { convertOkxKline, convertOkxOrder, convertOkxPosition } from "./converters.js";
import crypto from 'crypto';
export default class OkxStreams extends OkxBase {
    subscriptions = [];
    constructor(apiKey, apiSecret, apiPassphrase, isTest = false, exchangeInfoFutures) {
        super(apiKey, apiSecret, apiPassphrase, isTest, exchangeInfoFutures);
    }
    getTradingWsApiClient() {
        return () => undefined; // OkxStreams does not use BinanceWebsocketApiClient, so we return undefined
    }
    handleWebSocket(url, args, callback, parser, title, statusCallback, auth = false) {
        // ── OKX WebSocket spec constants ──
        const INITIAL_RECONNECT_DELAY = 3000;
        const MAX_RECONNECT_DELAY = 60000;
        const PING_TIMEOUT = 25000; // Must be < 30s per OKX docs
        const PONG_TIMEOUT = 10000; // Wait for pong before killing connection
        const SUB_CHUNK_SIZE = 50;
        const SUB_CHUNK_DELAY = 350; // ms between subscription batches (stay under 3 req/s)
        const RATE_LIMIT_OPS_PER_HOUR = 480;
        const RATE_LIMIT_WARN_THRESHOLD = 400;
        const id = Math.random().toString(36).substring(7);
        let isActive = true;
        let currentWs = null;
        let reconnectTimeout = null;
        let pingTimer = null;
        let pongTimer = null;
        let reconnectDelay = INITIAL_RECONNECT_DELAY;
        // ── Rate-limit tracking (480 subscribe/unsubscribe/login ops per hour per connection) ──
        let rateLimitOps = []; // timestamps of subscribe/login sends
        const trackRateLimitOp = () => {
            const now = Date.now();
            // Prune ops older than 1 hour
            rateLimitOps = rateLimitOps.filter(ts => now - ts < 3600000);
            if (rateLimitOps.length >= RATE_LIMIT_OPS_PER_HOUR) {
                console.error(`${title} - OKX rate limit reached (${RATE_LIMIT_OPS_PER_HOUR} subscribe/login ops per hour). Blocking send.`);
                return false;
            }
            if (rateLimitOps.length >= RATE_LIMIT_WARN_THRESHOLD) {
                console.warn(`${title} - Approaching OKX rate limit: ${rateLimitOps.length}/${RATE_LIMIT_OPS_PER_HOUR} ops in the last hour.`);
            }
            rateLimitOps.push(now);
            return true;
        };
        // ── Inactivity-based ping/pong (OKX spec: reset timer on every message) ──
        const resetPingTimer = () => {
            if (pingTimer)
                clearTimeout(pingTimer);
            if (!isActive || !currentWs)
                return;
            pingTimer = setTimeout(() => {
                if (currentWs?.readyState === ws.OPEN) {
                    currentWs.send("ping");
                    statusCallback?.('PING');
                    // Start pong timeout — if no pong arrives, kill the connection
                    pongTimer = setTimeout(() => {
                        console.warn(`${title} - Pong not received within ${PONG_TIMEOUT}ms, terminating connection...`);
                        currentWs?.terminate();
                    }, PONG_TIMEOUT);
                }
            }, PING_TIMEOUT);
        };
        const cleanup = () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (pingTimer) {
                clearTimeout(pingTimer);
                pingTimer = null;
            }
            if (pongTimer) {
                clearTimeout(pongTimer);
                pongTimer = null;
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
        this.subscriptions.push({ id, disconnect, title });
        return new Promise((resolve, reject) => {
            let isInitialConnection = true;
            let scheduleReconnect;
            const connect = () => {
                if (!isActive)
                    return;
                cleanup();
                try {
                    currentWs = new ws(url);
                }
                catch (e) {
                    console.error(`${title} - Failed to create WebSocket`, e);
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        reject(e);
                    }
                    else {
                        scheduleReconnect();
                    }
                    return;
                }
                currentWs.on('open', () => {
                    statusCallback?.('OPEN');
                    // Reset backoff on successful open
                    reconnectDelay = INITIAL_RECONNECT_DELAY;
                    // Reset per-connection rate limit counter
                    rateLimitOps = [];
                    const sendSubscriptions = async () => {
                        if (args.length === 0)
                            return;
                        for (let i = 0; i < args.length; i += SUB_CHUNK_SIZE) {
                            if (!trackRateLimitOp())
                                break;
                            const chunk = args.slice(i, i + SUB_CHUNK_SIZE);
                            const subParams = {
                                op: 'subscribe',
                                args: chunk
                            };
                            currentWs?.send(JSON.stringify(subParams));
                            // Delay between chunks to stay under OKX 3 req/s limit
                            if (i + SUB_CHUNK_SIZE < args.length) {
                                await new Promise(r => setTimeout(r, SUB_CHUNK_DELAY));
                            }
                        }
                    };
                    if (auth && this.apiKey && this.apiSecret) {
                        if (!trackRateLimitOp()) {
                            console.error(`${title} - Rate limit reached, cannot send login. Closing.`);
                            currentWs?.close();
                            return;
                        }
                        const timestamp = Math.floor(Date.now() / 1000).toString();
                        const signString = timestamp + 'GET' + '/users/self/verify';
                        const signature = crypto.createHmac('sha256', this.apiSecret).update(signString).digest('base64');
                        const authParams = {
                            op: 'login',
                            args: [{
                                    apiKey: this.apiKey,
                                    passphrase: this.apiPassphrase,
                                    timestamp,
                                    sign: signature
                                }]
                        };
                        currentWs?.send(JSON.stringify(authParams));
                        // Subscriptions will be sent after login confirmation in the message handler
                        currentWs.__pendingSubscribe = sendSubscriptions;
                    }
                    else {
                        // No auth needed, subscribe immediately
                        void sendSubscriptions();
                    }
                    // Start the inactivity-based ping timer
                    resetPingTimer();
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });
                currentWs.on('message', (data) => {
                    // Reset ping timer on EVERY received message (OKX spec)
                    resetPingTimer();
                    try {
                        const messageStr = data.toString();
                        if (messageStr === 'pong') {
                            // Clear pong timeout — server is alive
                            if (pongTimer) {
                                clearTimeout(pongTimer);
                                pongTimer = null;
                            }
                            statusCallback?.('PONG');
                            return;
                        }
                        const parsed = JSON.parse(messageStr);
                        if (parsed.event === 'login') {
                            if (parsed.code === '0') {
                                // Login successful, send pending subscriptions
                                const pendingFn = currentWs?.__pendingSubscribe;
                                if (pendingFn) {
                                    void pendingFn();
                                    delete currentWs.__pendingSubscribe;
                                }
                            }
                            else {
                                // Auth failed — close the connection, don't leave a zombie
                                console.error(`${title} - Auth Failed (code: ${parsed.code}): ${parsed.msg}`);
                                statusCallback?.('AUTH_FAILED');
                                currentWs?.close();
                            }
                            return;
                        }
                        if (parsed.event === 'subscribe') {
                            return;
                        }
                        if (parsed.event === 'error') {
                            console.error(`${title} - Error: ${parsed.msg}`);
                            return;
                        }
                        if (parsed.arg && parsed.data) {
                            const result = parser(parsed);
                            if (result)
                                callback(result);
                        }
                    }
                    catch (e) {
                        // silently ignore parsing errors on standard noise
                    }
                });
                currentWs.on('close', (code, reason) => {
                    if (!isActive)
                        return;
                    console.log(`${title} - WebSocket closed (code: ${code}), reconnecting in ${Math.round(reconnectDelay)}ms...`);
                    statusCallback?.('CLOSE');
                    scheduleReconnect();
                });
                currentWs.on('error', (err) => {
                    console.error(`${title} - WebSocket error`, err);
                    statusCallback?.('ERROR');
                });
            };
            // ── Exponential backoff with jitter (defined after connect for mutual reference) ──
            scheduleReconnect = () => {
                if (!isActive)
                    return;
                const jitter = reconnectDelay * (0.8 + Math.random() * 0.4); // ±20%
                reconnectTimeout = setTimeout(connect, jitter);
                reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
            };
            connect();
        });
    }
    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        this.destroy();
    }
    closeById(id) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }
    // --- Parsers ---
    convertOrderContractsToAssetSize(order) {
        const symbol = order.symbol;
        const originalQuantity = this.convertContractsToAssetSize(symbol, order.originalQuantity);
        const orderLastFilledQuantity = this.convertContractsToAssetSize(symbol, order.orderLastFilledQuantity);
        const orderFilledAccumulatedQuantity = this.convertContractsToAssetSize(symbol, order.orderFilledAccumulatedQuantity);
        return {
            ...order,
            originalQuantity: originalQuantity ?? order.originalQuantity,
            orderLastFilledQuantity: orderLastFilledQuantity ?? order.orderLastFilledQuantity,
            orderFilledAccumulatedQuantity: orderFilledAccumulatedQuantity ?? order.orderFilledAccumulatedQuantity
        };
    }
    convertPositionContractsToAssetSize(position) {
        const symbol = position.symbol;
        const positionAmount = this.convertContractsToAssetSize(symbol, position.positionAmount);
        return {
            ...position,
            positionAmount: positionAmount ?? position.positionAmount
        };
    }
    parseDepth(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            asks: data.asks.map((a) => [a[0], a[1]]),
            bids: data.bids.map((b) => [b[0], b[1]])
        };
    }
    parseDepthFutures(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        const convertSize = (sizeStr) => {
            const size = parseFloat(sizeStr);
            const converted = this.convertContractsToAssetSize(symbol, size);
            return (converted ?? size).toString();
        };
        return {
            symbol: symbol,
            asks: data.asks.map((a) => [a[0], convertSize(a[1])]),
            bids: data.bids.map((b) => [b[0], convertSize(b[1])])
        };
    }
    parseKline(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const item = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return convertOkxKline(item, symbol);
    }
    parseBookTicker(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        if (data.bids?.[0] && data.asks?.[0]) {
            return {
                symbol: symbol,
                bestBid: parseFloat(data.bids[0][0]),
                bestBidQty: parseFloat(data.bids[0][1]),
                bestAsk: parseFloat(data.asks[0][0]),
                bestAskQty: parseFloat(data.asks[0][1])
            };
        }
        return undefined;
    }
    parseBookTickerFutures(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        if (data.bids?.[0] && data.asks?.[0]) {
            const bidQty = parseFloat(data.bids[0][1]);
            const askQty = parseFloat(data.asks[0][1]);
            return {
                symbol: symbol,
                bestBid: parseFloat(data.bids[0][0]),
                bestBidQty: this.convertContractsToAssetSize(symbol, bidQty) ?? bidQty,
                bestAsk: parseFloat(data.asks[0][0]),
                bestAskQty: this.convertContractsToAssetSize(symbol, askQty) ?? askQty
            };
        }
        return undefined;
    }
    parseTrade(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const trade = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            price: parseFloat(trade.px),
            quantity: parseFloat(trade.sz),
            tradeTime: parseInt(trade.ts),
            orderType: trade.side.toUpperCase()
        };
    }
    parseTradeFutures(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const trade = msg.data[0];
        const symbol = msg.arg?.instId || '';
        const size = parseFloat(trade.sz);
        const quantity = this.convertContractsToAssetSize(symbol, size) ?? size;
        return {
            symbol: symbol,
            price: parseFloat(trade.px),
            quantity: quantity,
            tradeTime: parseInt(trade.ts),
            orderType: trade.side.toUpperCase()
        };
    }
    parseFunding(msg) {
        if (!msg.data || msg.data.length === 0)
            return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            rate: parseFloat(data.fundingRate || '0'),
            nextFundingTime: parseInt(data.nextFundingTime || '0'),
            interval: undefined
        };
    }
    // --- Futures Streams (SWAP) ---
    // Use "books" for depth (or books5/books50-l2-tbt)
    async futuresDepthStream(symbols, callback, statusCallback, levels = 0) {
        await this.assertInstrumentsReady();
        let channel = 'books';
        if (levels === 5)
            channel = 'books5';
        else if (levels === 50)
            channel = 'books50-l2-tbt';
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseDepthFutures.bind(this), 'futuresDepthStream', statusCallback);
    }
    // OKX candle intervals: 1m,3m,5m,15m,30m,1H,2H,4H,6H,12H,1D,2D,3D,5D,1W,1M,3M,6M,1Y
    // Incoming intervals from the app follow Binance convention (lowercase h/d/w/m/y for hours+)
    normalizeOkxInterval(interval) {
        const map = {
            '1h': '1H', '2h': '2H', '4h': '4H',
            '6h': '6H', '8h': '6H', '12h': '12H',
            '1d': '1D', '2d': '2D', '3d': '3D',
            '5d': '5D', '1w': '1W',
            '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y'
        };
        return map[interval] ?? interval;
    }
    // candle channel format e.g., candle1m
    futuresCandleStickStream(symbols, interval, callback, statusCallback) {
        const channel = `candle${this.normalizeOkxInterval(interval)}`;
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('business'), args, callback, this.parseKline, 'futuresCandleStickStream', statusCallback);
    }
    async futuresBookTickerStream(symbols, callback, statusCallback) {
        await this.assertInstrumentsReady();
        // We use bbo-tbt for fast best bid/ask
        const args = symbols.map(s => ({ channel: 'bbo-tbt', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseBookTickerFutures.bind(this), 'futuresBookTickerStream', statusCallback);
    }
    async futuresTradeStream(symbols, callback, statusCallback) {
        await this.assertInstrumentsReady();
        const args = symbols.map(s => ({ channel: 'trades', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseTradeFutures.bind(this), 'futuresTradeStream', statusCallback);
    }
    async futuresUserDataStream(callback, statusCallback) {
        await this.assertInstrumentsReady();
        // Private channels (account, positions, orders) go on /private
        const privateArgs = [
            { channel: 'account' },
            { channel: 'positions', instType: 'SWAP' },
            { channel: 'orders', instType: 'SWAP' }
        ];
        // orders-algo was moved to /business WebSocket in June 2023
        const businessArgs = [
            { channel: 'orders-algo', instType: 'SWAP' }
        ];
        // Open the business WebSocket for orders-algo (runs in background)
        this.handleWebSocket(this.getStreamUrl('business'), businessArgs, callback, (msg) => {
            const channel = msg.arg?.channel;
            if (channel === 'orders-algo') {
                if (msg.data && Array.isArray(msg.data)) {
                    const orders = [];
                    for (const order of msg.data) {
                        orders.push(this.convertOrderContractsToAssetSize(convertOkxOrder(order)));
                    }
                    return {
                        event: 'ORDER_TRADE_UPDATE',
                        orderData: orders,
                        accountData: undefined
                    };
                }
            }
            return undefined;
        }, 'futuresUserDataStream-business', statusCallback, true);
        // Open the main private WebSocket for account/positions/orders
        this.handleWebSocket(this.getStreamUrl('private'), privateArgs, callback, (msg) => {
            const channel = msg.arg?.channel;
            if (channel === 'account') {
                const balances = [];
                if (msg.data && Array.isArray(msg.data)) {
                    for (const acc of msg.data) {
                        if (acc.details && Array.isArray(acc.details)) {
                            for (const d of acc.details) {
                                balances.push({
                                    asset: d.ccy,
                                    balance: d.cashBal,
                                    crossWalletBalance: d.eq,
                                    balanceChange: '0'
                                });
                            }
                        }
                    }
                }
                return {
                    event: 'ACCOUNT_UPDATE',
                    accountData: { balances: balances, positions: undefined },
                    orderData: undefined
                };
            }
            if (channel === 'positions') {
                if (msg.data && Array.isArray(msg.data)) {
                    const positions = msg.data.map(convertOkxPosition).map(p => this.convertPositionContractsToAssetSize(p));
                    return {
                        event: 'ACCOUNT_UPDATE',
                        accountData: { balances: undefined, positions: positions },
                        orderData: undefined
                    };
                }
            }
            if (channel === 'orders') {
                if (msg.data && Array.isArray(msg.data)) {
                    const orders = [];
                    for (const order of msg.data) {
                        orders.push(this.convertOrderContractsToAssetSize(convertOkxOrder(order)));
                    }
                    return {
                        event: 'ORDER_TRADE_UPDATE',
                        orderData: orders,
                        accountData: undefined
                    };
                }
            }
            return undefined;
        }, 'futuresUserDataStream', statusCallback, true);
        const CombinedHandleWebSocketResponse = {
            disconnect: () => {
                this.subscriptions.forEach(sub => {
                    if (sub.title === 'futuresUserDataStream-business' || sub.title === 'futuresUserDataStream') {
                        sub.disconnect();
                    }
                });
            },
            id: 'futuresUserDataStream',
        };
        return CombinedHandleWebSocketResponse;
    }
    // --- Spot Streams ---
    spotDepthStream(symbols, callback, statusCallback, levels = 0) {
        let channel = 'books';
        if (levels === 5)
            channel = 'books5';
        else if (levels === 50)
            channel = 'books50-l2-tbt';
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseDepth, 'spotDepthStream', statusCallback);
    }
    spotCandleStickStream(symbols, interval, callback, statusCallback) {
        const channel = `candle${this.normalizeOkxInterval(interval)}`;
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('business'), args, callback, this.parseKline, 'spotCandleStickStream', statusCallback);
    }
    spotBookTickerStream(symbols, callback, statusCallback) {
        const args = symbols.map(s => ({ channel: 'bbo-tbt', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseBookTicker, 'spotBookTickerStream', statusCallback);
    }
    spotTradeStream(symbols, callback, statusCallback) {
        const args = symbols.map(s => ({ channel: 'trades', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseTrade, 'spotTradeStream', statusCallback);
    }
    fundingStream(symbols, callback, statusCallback) {
        const args = symbols.map(s => ({ channel: 'funding-rate', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseFunding, 'fundingStream', statusCallback);
    }
}
