
import BybitBase from "./BybitBase.js";
import { IStreamManager } from "../core/IStreamManager.js";
import ws from 'ws';
import { SocketStatus, HandleWebSocket, UserData } from "../core/types/streams.js";
import { DepthData, KlineData, TradeData, BookTickerData, OrderData, PositionData, BalanceData, OrderStatus, OrderWorkingType, OrderType } from "../core/types.js";
import { convertBybitKline, BybitWsMessage, BybitOrderWsData, BybitPositionWsData, BybitWalletWsData, mapBybitTriggerBy, BybitDepthWsData, BybitKlineWsData, BybitBookTickerWsData, BybitTradeWsData } from "./converters.js";
import { PositionDirection, TimeInForce } from "../core/types.js";

// Extend BybitBase to get access to API keys and Base URLs
export default class BybitStreams extends BybitBase implements IStreamManager {

    protected subscriptions: { id: string, disconnect: Function }[] = [];

    constructor(apiKey?: string, apiSecret?: string, isTest: boolean = false) {
        super(apiKey, apiSecret, isTest);
    }

    // --- Base WebSocket Handler ---

    protected handleWebSocket(
        url: string,
        topics: string[],
        callback: Function,
        parser: Function,
        title: string,
        statusCallback?: (status: SocketStatus) => void,
        auth: boolean = false
    ): Promise<HandleWebSocket> {
        const RECONNECT_DELAY = 3000;
        const PING_INTERVAL = 20000; // Bybit needs ping every 20s

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

        this.subscriptions.push({ id, disconnect });

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
                        if (currentWs?.readyState === ws.OPEN) {
                            currentWs.send(JSON.stringify({ op: "ping" }));
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
                        const parsed = JSON.parse(data.toString());

                        if (parsed.op === 'pong') {
                            statusCallback?.('PONG');
                            return;
                        }

                        if (parsed.op === 'auth') {
                            if (!parsed.success) console.error(`${title} - Auth Failed: ${parsed.ret_msg}`);
                            return;
                        }
                        if (parsed.op === 'subscribe') {
                            if (!parsed.success) console.error(`${title} - Subscribe Failed: ${parsed.ret_msg}`);
                            return;
                        }

                        if (parsed.topic && parsed.data) {
                            const result = parser(parsed);
                            if (result) callback(result);
                        }
                    } catch (e) {
                        console.error(`${title} - Error parsing message`, e);
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

    private generateHmacSignature(expires: number): string {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', this.apiSecret).update(`GET/realtime${expires}`).digest('hex');
    }

    // --- IStreamManager Implementation ---

    closeAllSockets() {
        this.subscriptions.forEach(sub => sub.disconnect());
        this.subscriptions = [];
        this.destroy(); // from base
    }

    closeById(id: string) {
        const index = this.subscriptions.findIndex(i => i.id === id);
        if (index > -1) {
            this.subscriptions[index].disconnect();
            this.subscriptions.splice(index, 1);
        }
    }

    // --- Parsers ---

    private parseDepth(msg: BybitWsMessage): DepthData | undefined {
        const data = msg.data as BybitDepthWsData;
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
        }
    }

    private parseKline(msg: BybitWsMessage): KlineData | undefined {
        if (Array.isArray(msg.data)) {
            const item = msg.data[0] as BybitKlineWsData;
            return {
                symbol: msg.topic?.split('.')[2] || '',
                time: item.start,
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume),
                trades: 0
            } as KlineData;
        }
        return undefined;
    }

    private parseBookTicker(msg: BybitWsMessage): BookTickerData | undefined {
        const data = msg.data as BybitBookTickerWsData;
        return {
            symbol: data.symbol,
            bestBid: parseFloat(data.bid1Price),
            bestBidQty: parseFloat(data.bid1Size),
            bestAsk: parseFloat(data.ask1Price),
            bestAskQty: parseFloat(data.ask1Size)
        } as BookTickerData;
    }

    private parseTrade(msg: BybitWsMessage): TradeData | undefined {
        if (Array.isArray(msg.data)) {
            const trade = msg.data[0] as BybitTradeWsData;
            return {
                symbol: trade.s,
                price: parseFloat(trade.p),
                quantity: parseFloat(trade.v),
                tradeTime: trade.T,
                orderType: trade.S === 'Buy' ? 'BUY' : 'SELL'
            } as TradeData;
        }
        return undefined;
    }

    /**
     * Maps Bybit order statuses to unified format (Binance standard)
     * Bybit statuses: Created, New, Rejected, PartiallyFilled, PartiallyFilled (Cancelled), Filled, Cancelled, Untriggered, Triggered, Deactivated
     * Unified statuses: NEW, PARTIALLY_FILLED, FILLED, CANCELED, PENDING_CANCEL, REJECTED, EXPIRED, PENDING, TRIGGERED, FINISHED
     */
    private mapBybitOrderStatus(bybitStatus: string): OrderStatus {
        const statusMap: { [key: string]: OrderStatus } = {
            'Created': 'NEW',
            'New': 'NEW',
            'Rejected': 'REJECTED',
            'PartiallyFilled': 'PARTIALLY_FILLED',
            'Filled': 'FILLED',
            'Cancelled': 'CANCELED',
            'PendingCancel': 'PENDING_CANCEL',
            'Untriggered': 'PENDING',
            'Triggered': 'TRIGGERED',
            'Deactivated': 'EXPIRED'
        };

        return statusMap[bybitStatus] || bybitStatus as OrderStatus;
    }


    // --- Future Streams (Linear) ---

    public futuresDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `orderbook.50.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseDepth, 'futuresDepthStream', statusCallback);
    }

    public futuresCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        let bybitInterval = interval.replace('m', '');
        if (interval === '1h') bybitInterval = '60';
        if (interval === '4h') bybitInterval = '240';
        if (interval === '1d') bybitInterval = 'D';

        const topics = symbols.map(s => `kline.${bybitInterval}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseKline, 'futuresCandleStickStream', statusCallback);
    }

    public futuresBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `tickers.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseBookTicker, 'futuresBookTickerStream', statusCallback);
    }

    public futuresTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `publicTrade.${s}`);
        return this.handleWebSocket(this.getStreamUrl('linear'), topics, callback, this.parseTrade, 'futuresTradeStream', statusCallback);
    }

    public async futuresUserDataStream(callback: (data: UserData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = ['execution', 'order', 'position', 'wallet'];
        return this.handleWebSocket(
            this.getStreamUrl('private'),
            topics,
            callback,
            (msg: BybitWsMessage) => {
                const topic = msg.topic;
                const dataList = msg.data;

                if (topic === 'position') {
                    const positions: PositionData[] = dataList.map((p: BybitPositionWsData) => {
                        let dir: PositionDirection = 'LONG';
                        if (p.side === 'Sell' || p.positionIdx === 2) dir = 'SHORT';
                        return {
                            symbol: p.symbol,
                            positionAmount: parseFloat(p.size),
                            entryPrice: parseFloat(p.avgPrice || p.entryPrice || '0'),
                            positionDirection: dir,
                            isInPosition: parseFloat(p.size) > 0,
                            unrealizedPnL: parseFloat(p.unrealisedPnl || '0')
                        } as PositionData;
                    });
                    return {
                        event: 'ACCOUNT_UPDATE',
                        accountData: { balances: undefined, positions: positions },
                        orderData: undefined
                    } as UserData;
                }

                if (topic === 'order') {
                    const o = dataList[0] as BybitOrderWsData;

                    // Handle Bybit's special case: order may show as "Filled" but actually was cancelled
                    // Bybit v5 API: "You may receive two orderStatus=Filled messages when the cancel request
                    // is accepted but the order is executed at the same time. Generally, one message contains
                    // orderStatus=Filled, rejectReason=EC_NoError, and another message contains
                    // orderStatus=Filled, cancelType=CancelByUser, rejectReason=EC_OrigClOrdIDDoesNotExist.
                    // The first message tells you the order is executed, and the second message tells you
                    // the followed cancel request is rejected due to order is executed."
                    let orderStatus: string = o.orderStatus;

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
                    const unifiedOrderStatus: OrderStatus = this.mapBybitOrderStatus(orderStatus);

                    const orderData: OrderData = {
                        symbol: o.symbol,
                        clientOrderId: o.orderLinkId || o.orderId,
                        side: o.side.toUpperCase() as 'BUY' | 'SELL',
                        orderType: o.orderType.toUpperCase() as OrderType,
                        timeInForce: (o.timeInForce === 'PostOnly' ? 'GTX' : o.timeInForce) as TimeInForce,
                        originalQuantity: parseFloat(o.qty),
                        originalPrice: parseFloat(o.price || '0'),
                        averagePrice: parseFloat(o.avgPrice || '0'),
                        stopPrice: parseFloat(o.triggerPrice || '0'),
                        executionType: unifiedOrderStatus,
                        orderStatus: unifiedOrderStatus,
                        orderId: o.orderId,
                        orderLastFilledQuantity: parseFloat(o.lastExecQty || '0'),
                        orderFilledAccumulatedQuantity: parseFloat(o.cumExecQty || '0'),
                        lastFilledPrice: parseFloat(o.lastExecPrice || '0'),
                        commissionAsset: '',
                        commission: o.cumExecFee || '0',
                        orderTradeTime: parseInt(o.updatedTime),
                        tradeId: 0,
                        isMakerSide: false,
                        isReduceOnly: o.reduceOnly,
                        workingType: mapBybitTriggerBy(o.triggerBy),
                        originalOrderType: o.orderType.toUpperCase() as OrderType,
                        positionSide: o.positionIdx === 1 ? 'LONG' : (o.positionIdx === 2 ? 'SHORT' : 'BOTH'),
                        closeAll: false,
                        activationPrice: o.triggerPrice,
                        callbackRate: '',
                        realizedProfit: '',
                        isAlgoOrder: false
                    };
                    return {
                        event: 'ORDER_TRADE_UPDATE',
                        orderData: orderData,
                        accountData: undefined
                    } as UserData;
                }

                if (topic === 'wallet') {
                    const balances: BalanceData[] = [];

                    // Bybit V5 wallet stream structure: data is array of accounts, each has 'coin' array
                    if (Array.isArray(dataList)) {
                        dataList.forEach((account: BybitWalletWsData) => {
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
                    } as UserData;
                }

                return undefined;
            },
            'futuresUserDataStream',
            statusCallback,
            true
        );
    }

    // --- Spot Streams (Public) ---
    // Bybit V5 Spot Public topics use same structure as Linear

    public spotDepthStream(symbols: string[], callback: (data: DepthData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `orderbook.50.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseDepth, 'spotDepthStream', statusCallback);
    }

    public spotCandleStickStream(symbols: string[], interval: string, callback: (data: KlineData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        let bybitInterval = interval.replace('m', '');
        if (interval === '1h') bybitInterval = '60';
        if (interval === '4h') bybitInterval = '240';
        if (interval === '1d') bybitInterval = 'D';

        const topics = symbols.map(s => `kline.${bybitInterval}.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseKline, 'spotCandleStickStream', statusCallback);
    }

    public spotBookTickerStream(symbols: string[], callback: (data: BookTickerData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `tickers.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseBookTicker, 'spotBookTickerStream', statusCallback);
    }

    public spotTradeStream(symbols: string[], callback: (data: TradeData) => void, statusCallback?: (status: SocketStatus) => void): Promise<HandleWebSocket> {
        const topics = symbols.map(s => `publicTrade.${s}`);
        return this.handleWebSocket(this.getStreamUrl('spot'), topics, callback, this.parseTrade, 'spotTradeStream', statusCallback);
    }


}
