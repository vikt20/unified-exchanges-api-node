import OkxBase from "./OkxBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import ws from 'ws';
import { SocketStatus, HandleWebSocket, UserData } from "../core/types/streams.js";
import { DepthData, KlineData, TradeData, BookTickerData, OrderData, PositionData, BalanceData, OrderStatus } from "../core/types.js";
import { convertOkxKline, convertOkxOrder, convertOkxPosition, OkxWsMessage } from "./converters.js";
import { PositionDirection, TimeInForce } from "../core/types.js";
import crypto from 'crypto';

export default class OkxStreams extends OkxBase implements IStreamManager {

    protected subscriptions: { id: string, disconnect: Function, title: string }[] = [];

    constructor(apiKey?: string, apiSecret?: string, apiPassphrase?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, apiPassphrase, isTest);
    }

    protected handleWebSocket(
        url: string,
        args: any[],
        callback: Function,
        parser: Function,
        title: string,
        statusCallback?: (status: SocketStatus) => void,
        auth: boolean = false
    ): Promise<HandleWebSocket> {
        const RECONNECT_DELAY = 3000;
        const PING_INTERVAL = 20000;

        const id = Math.random().toString(36).substring(7);
        let isActive = true;
        let currentWs: ws | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let pingInterval: NodeJS.Timeout | null = null;

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

        this.subscriptions.push({ id, disconnect, title });

        return new Promise((resolve, reject) => {
            let isInitialConnection = true;

            const connect = () => {
                if (!isActive) return;
                cleanup();

                try {
                    currentWs = new ws(url);
                } catch (e) {
                    console.error(`${title} - Failed to create WebSocket`, e);
                    if (isInitialConnection) {
                        isInitialConnection = false;
                        reject(e);
                    } else {
                        reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
                    }
                    return;
                }

                currentWs.on('open', () => {
                    statusCallback?.('OPEN');

                    const sendSubscriptions = () => {
                        if (args.length > 0) {
                            const chunkSize = 50;
                            for (let i = 0; i < args.length; i += chunkSize) {
                                const chunk = args.slice(i, i + chunkSize);
                                const subParams = {
                                    op: 'subscribe',
                                    args: chunk
                                };
                                currentWs?.send(JSON.stringify(subParams));
                            }
                        }
                    };

                    if (auth && this.apiKey && this.apiSecret) {
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
                        (currentWs as any).__pendingSubscribe = sendSubscriptions;
                    } else {
                        // No auth needed, subscribe immediately
                        sendSubscriptions();
                    }

                    pingInterval = setInterval(() => {
                        if (currentWs?.readyState === ws.OPEN) {
                            currentWs.send("ping");
                            statusCallback?.('PING');
                        }
                    }, PING_INTERVAL);

                    if (isInitialConnection) {
                        isInitialConnection = false;
                        resolve({ disconnect, id });
                    }
                });

                currentWs.on('message', (data: any) => {
                    try {
                        const messageStr = data.toString();
                        if (messageStr === 'pong') {
                            statusCallback?.('PONG');
                            return;
                        }

                        const parsed = JSON.parse(messageStr);

                        if (parsed.event === 'login') {
                            if (parsed.code === '0') {
                                // Login successful, send pending subscriptions
                                const pendingFn = (currentWs as any)?.__pendingSubscribe;
                                if (pendingFn) {
                                    pendingFn();
                                    delete (currentWs as any).__pendingSubscribe;
                                }
                            } else {
                                console.error(`${title} - Auth Failed: ${parsed.msg}`);
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
                            if (result) callback(result);
                        }
                    } catch (e) {
                        // silently ignore parsing errors on standard noise
                    }
                });

                currentWs.on('close', (code, reason) => {
                    if (!isActive) return;
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

    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        this.destroy();
    }

    closeById(id: string) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }

    // --- Parsers ---
    private convertOrderContractsToAssetSize(order: OrderData): OrderData {
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

    private convertPositionContractsToAssetSize(position: PositionData): PositionData {
        const symbol = position.symbol;
        const positionAmount = this.convertContractsToAssetSize(symbol, position.positionAmount);
        return {
            ...position,
            positionAmount: positionAmount ?? position.positionAmount
        };
    }

    private parseDepth(msg: OkxWsMessage): DepthData | undefined {
        if (!msg.data || msg.data.length === 0) return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            asks: data.asks.map((a: string[]) => [a[0], a[1]]),
            bids: data.bids.map((b: string[]) => [b[0], b[1]])
        };
    }

    private parseKline(msg: OkxWsMessage): KlineData | undefined {
        if (!msg.data || msg.data.length === 0) return undefined;
        const item = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return convertOkxKline(item, symbol);
    }

    private parseBookTicker(msg: OkxWsMessage): BookTickerData | undefined {
        if (!msg.data || msg.data.length === 0) return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        if (data.bids?.[0] && data.asks?.[0]) {
            return {
                symbol: symbol,
                bestBid: parseFloat(data.bids[0][0]),
                bestBidQty: parseFloat(data.bids[0][1]),
                bestAsk: parseFloat(data.asks[0][0]),
                bestAskQty: parseFloat(data.asks[0][1])
            } as BookTickerData;
        }
        return undefined;
    }

    private parseTrade(msg: OkxWsMessage): TradeData | undefined {
        if (!msg.data || msg.data.length === 0) return undefined;
        const trade = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            price: parseFloat(trade.px),
            quantity: parseFloat(trade.sz),
            tradeTime: parseInt(trade.ts),
            orderType: trade.side.toUpperCase() as 'BUY' | 'SELL'
        } as TradeData;
    }

    private parseFunding(msg: OkxWsMessage): import("../core/types.js").FundingData | undefined {
        if (!msg.data || msg.data.length === 0) return undefined;
        const data = msg.data[0];
        const symbol = msg.arg?.instId || '';
        return {
            symbol: symbol,
            rate: parseFloat(data.fundingRate || '0'),
            nextFundingTime: parseInt(data.nextFundingTime || '0'),
            interval: 8 // standard
        };
    }

    // --- Futures Streams (SWAP) ---

    // Use "books" for depth (or books5/books50-l2-tbt)
    public futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels: number = 5): Promise<HandleWebSocket> {
        let channel = 'books';
        if (levels === 5) channel = 'books5';
        else if (levels === 50) channel = 'books50-l2-tbt';
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseDepth, 'futuresDepthStream', statusCallback);
    }

    // OKX candle intervals: 1m,3m,5m,15m,30m,1H,2H,4H,6H,12H,1D,2D,3D,5D,1W,1M,3M,6M,1Y
    // Incoming intervals from the app follow Binance convention (lowercase h/d/w/m/y for hours+)
    public normalizeOkxInterval(interval: string): string {
        const map: Record<string, string> = {
            '1h': '1H', '2h': '2H', '4h': '4H',
            '6h': '6H', '8h': '6H', '12h': '12H',
            '1d': '1D', '2d': '2D', '3d': '3D',
            '5d': '5D', '1w': '1W',
            '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y'
        }
        return map[interval] ?? interval
    }

    // candle channel format e.g., candle1m
    public futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const channel = `candle${this.normalizeOkxInterval(interval)}`;
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('business'), args, callback, this.parseKline, 'futuresCandleStickStream', statusCallback);
    }

    public futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        // We use bbo-tbt for fast best bid/ask
        const args = symbols.map(s => ({ channel: 'bbo-tbt', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseBookTicker, 'futuresBookTickerStream', statusCallback);
    }

    public futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const args = symbols.map(s => ({ channel: 'trades', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseTrade, 'futuresTradeStream', statusCallback);
    }

    public async futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
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
        this.handleWebSocket(
            this.getStreamUrl('business'),
            businessArgs,
            callback,
            (msg: OkxWsMessage) => {
                const channel = msg.arg?.channel;
                if (channel === 'orders-algo') {
                    if (msg.data && Array.isArray(msg.data)) {
                        const orders: OrderData[] = [];
                        for (const order of msg.data) {
                            orders.push(this.convertOrderContractsToAssetSize(convertOkxOrder(order)));
                        }
                        return {
                            event: 'ORDER_TRADE_UPDATE',
                            orderData: orders,
                            accountData: undefined
                        } as UserData;
                    }
                }
                return undefined;
            },
            'futuresUserDataStream-business',
            statusCallback,
            true
        );

        // Open the main private WebSocket for account/positions/orders
        this.handleWebSocket(
            this.getStreamUrl('private'),
            privateArgs,
            callback,
            (msg: OkxWsMessage) => {
                const channel = msg.arg?.channel;

                if (channel === 'account') {
                    const balances: BalanceData[] = [];
                    if (msg.data && Array.isArray(msg.data)) {
                        for (const acc of msg.data) {
                            if (acc.details && Array.isArray(acc.details)) {
                                for (const d of acc.details) {
                                    balances.push({
                                        asset: d.ccy,
                                        balance: d.eq,
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
                    } as UserData;
                }

                if (channel === 'positions') {
                    if (msg.data && Array.isArray(msg.data)) {
                        const positions = msg.data.map(convertOkxPosition).map(p => this.convertPositionContractsToAssetSize(p));
                        return {
                            event: 'ACCOUNT_UPDATE',
                            accountData: { balances: undefined, positions: positions },
                            orderData: undefined
                        } as UserData;
                    }
                }

                if (channel === 'orders') {
                    if (msg.data && Array.isArray(msg.data)) {
                        const orders: OrderData[] = [];
                        for (const order of msg.data) {
                            orders.push(this.convertOrderContractsToAssetSize(convertOkxOrder(order)));
                        }
                        return {
                            event: 'ORDER_TRADE_UPDATE',
                            orderData: orders,
                            accountData: undefined
                        } as UserData;
                    }
                }

                return undefined;
            },
            'futuresUserDataStream',
            statusCallback,
            true
        );

        const CombinedHandleWebSocketResponse: HandleWebSocket = {
            disconnect: () => {
                this.subscriptions.forEach(sub => {
                    if (sub.title === 'futuresUserDataStream-business' || sub.title === 'futuresUserDataStream') {
                        sub.disconnect();
                    }
                });
            },
            id: 'futuresUserDataStream',
        }

        return CombinedHandleWebSocketResponse;
    }

    // --- Spot Streams ---

    public spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void, levels: number = 5): Promise<HandleWebSocket> {
        let channel = 'books';
        if (levels === 5) channel = 'books5';
        else if (levels === 50) channel = 'books50-l2-tbt';
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseDepth, 'spotDepthStream', statusCallback);
    }

    public spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const channel = `candle${this.normalizeOkxInterval(interval)}`;
        const args = symbols.map(s => ({ channel, instId: s }));
        return this.handleWebSocket(this.getStreamUrl('business'), args, callback, this.parseKline, 'spotCandleStickStream', statusCallback);
    }

    public spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const args = symbols.map(s => ({ channel: 'bbo-tbt', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseBookTicker, 'spotBookTickerStream', statusCallback);
    }

    public spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const args = symbols.map(s => ({ channel: 'trades', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseTrade, 'spotTradeStream', statusCallback);
    }

    public fundingStream(symbols: string[], callback: (data: import("../core/types.js").FundingData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const args = symbols.map(s => ({ channel: 'funding-rate', instId: s }));
        return this.handleWebSocket(this.getStreamUrl('public'), args, callback, this.parseFunding, 'fundingStream', statusCallback);
    }
}
