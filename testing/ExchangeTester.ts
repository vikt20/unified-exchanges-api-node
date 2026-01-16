
import { IExchangeClient } from '../core/IExchangeClient.js';
import { IStreamManager } from '../core/IStreamManager.js';
import { UserData, HandleWebSocket } from '../core/types/streams.js';
import {
    Validator,
    KlineSchema,
    StaticDepthSchema,
    ExchangeInfoSchema,
    BalanceDataSchema,
    AccountDataSchema,
    PositionSchema,
    OrderSchema,
    StreamDepthSchema,
    TradeDataSchema,
    BookTickerDataSchema,
    UserDataEventSchema,
    OrderRequestResponseSchema,
    FundingDataSchema
} from './Validator.js';

interface TestContext {
    userDataHandle?: HandleWebSocket;
    userDataEvents: UserData[];
    placedOrderIds: { clientOrderId: string; orderId: number }[];
    testPrice?: number;
}

export class ExchangeTester {
    private client: IExchangeClient;
    private name: string;
    private symbol: string;
    private context: TestContext;

    constructor(client: IExchangeClient, name: string, testSymbol: string) {
        this.client = client;
        this.name = name;
        this.symbol = testSymbol;
        this.context = {
            userDataEvents: [],
            placedOrderIds: []
        };
    }

    public async runAllTests() {
        console.log(`\n === Starting Tests for ${this.name}(${this.symbol}) === `);

        await this.testPublicMarketData();
        // await this.testPrivateAccountData();
        await this.testStreams();

        console.log(`=== Tests Complete for ${this.name} ===\n`);
    }

    /**
     * Comprehensive authenticated testing sequence:
     * 1. Start User Data Stream
     * 2. Place Orders
     * 3. Query Orders/Positions
     * 4. Cancel Orders
     * 5. Cleanup
     */
    public async runAuthenticatedTests() {
        console.log(`\n === Starting Authenticated Tests for ${this.name}(${this.symbol}) === `);

        // Step 1: Start User Data Stream
        await this.testUserDataStream();

        // Step 2: Place Orders (limit and market)
        await this.testOrderPlacement();

        // Wait a moment for events to propagate
        await this.sleep(2000);

        // Step 3: Query Orders and Positions
        await this.testOrderQueryMethods();

        // Step 4: Cancel Orders
        await this.testOrderCancellation();

        // Step 5: Cleanup
        await this.testCleanup();

        // Summary of user data events received
        this.summarizeUserDataEvents();

        console.log(`=== Authenticated Tests Complete for ${this.name} ===\n`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // USER DATA STREAM TESTING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testUserDataStream() {
        console.log(`[${this.name}] Starting User Data Stream...`);

        const streamClient = this.client as unknown as IStreamManager;

        if (typeof streamClient.futuresUserDataStream !== 'function') {
            console.log(`   [SKIP] futuresUserDataStream not available`);
            return;
        }

        try {
            this.context.userDataHandle = await streamClient.futuresUserDataStream(
                (data: UserData) => {
                    // Validate each event
                    const result = Validator.validate(data, UserDataEventSchema);
                    if (result.valid) {
                        console.log(`   [EVENT] ${data.event} received ✓`);
                    } else {
                        console.log(`   [EVENT] ${data.event} received (validation issues: ${result.errors.join(', ')})`);
                    }
                    this.context.userDataEvents.push(data);
                },
                (status) => {
                    if (status === 'OPEN') {
                        console.log(`   [PASS] User Data Stream connected`);
                    } else if (status === 'ERROR') {
                        console.log(`   [WARN] User Data Stream status: ${status}`);
                    }
                }
            );

            // Wait for connection
            await this.sleep(1000);

        } catch (e) {
            this.fail('User Data Stream exception', e);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ORDER PLACEMENT TESTING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testOrderPlacement() {
        console.log(`[${this.name}] Testing Order Placement...`);

        // Get current market price first
        try {
            const klines = await this.client.getKlines({ symbol: this.symbol, interval: '1m', limit: 1 });
            if (klines.success && klines.data && klines.data.length > 0) {
                this.context.testPrice = klines.data[0].close;
                console.log(`   Current price for ${this.symbol}: ${this.context.testPrice}`);
            } else {
                console.error(`   [WARN] Could not get current price, using default`);
                this.context.testPrice = 50000; // fallback for BTC
            }
        } catch (e) {
            this.context.testPrice = 50000;
        }

        const price = this.context.testPrice!;
        const limitBuyPrice = Math.floor(price * 0.90); // 10% below market
        const limitSellPrice = Math.floor(price * 1.10); // 10% above market
        // Calculate quantity to meet minimum notional (100 USDT) + buffer
        // notional = price * quantity >= 100, so quantity >= 100 / price
        const minQuantity = Math.ceil((110 / price) * 1000) / 1000; // Round up to 3 decimals
        const quantity = Math.max(minQuantity, 0.002); // At least 0.002 BTC

        // 1. Limit Buy Order (won't fill immediately)
        try {
            const response = await this.client.limitBuy({
                symbol: this.symbol,
                price: limitBuyPrice,
                quantity: quantity
            });

            this.assert(response.success, 'limitBuy');
            if (response.success && response.data) {
                this.validateObject('limitBuy response', response.data, OrderRequestResponseSchema);
                this.context.placedOrderIds.push({
                    clientOrderId: response.data.clientOrderId,
                    orderId: response.data.orderId
                });
                console.log(`   Order placed: ${response.data.clientOrderId} (Buy @ ${limitBuyPrice})`);
            } else {
                console.error(`   [FAIL] limitBuy failed: ${response.errors}`);
            }
        } catch (e) {
            this.fail('limitBuy exception', e);
        }

        // 2. Limit Sell Order (won't fill immediately)
        try {
            const response = await this.client.limitSell({
                symbol: this.symbol,
                price: limitSellPrice,
                quantity: quantity
            });

            this.assert(response.success, 'limitSell');
            if (response.success && response.data) {
                this.validateObject('limitSell response', response.data, OrderRequestResponseSchema);
                this.context.placedOrderIds.push({
                    clientOrderId: response.data.clientOrderId,
                    orderId: response.data.orderId
                });
                console.log(`   Order placed: ${response.data.clientOrderId} (Sell @ ${limitSellPrice})`);
            } else {
                console.error(`   [FAIL] limitSell failed: ${response.errors}`);
            }
        } catch (e) {
            this.fail('limitSell exception', e);
        }

        // 3. Market Buy (will fill and create position)
        try {
            const response = await this.client.marketBuy({
                symbol: this.symbol,
                quantity: quantity
            });

            this.assert(response.success, 'marketBuy');
            if (response.success && response.data) {
                console.log(`   Market Buy executed: ${response.data.clientOrderId}`);
            } else {
                console.error(`   [WARN] marketBuy failed: ${response.errors}`);
            }
        } catch (e) {
            this.fail('marketBuy exception', e);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ORDER QUERY METHODS TESTING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testOrderQueryMethods() {
        console.log(`[${this.name}] Testing Order Query Methods...`);

        // 1. Get Open Orders
        try {
            const orders = await this.client.getOpenOrders();
            this.assert(orders.success, 'getOpenOrders');
            if (orders.success && orders.data) {
                console.log(`   Open Orders count: ${orders.data.length}`);
                if (orders.data.length > 0) {
                    this.validateArray('Open Orders', orders.data, OrderSchema);
                }
            }
        } catch (e) {
            this.fail('getOpenOrders exception', e);
        }

        // 2. Get Open Orders By Symbol
        try {
            const orders = await this.client.getOpenOrdersBySymbol({ symbol: this.symbol });
            this.assert(orders.success, 'getOpenOrdersBySymbol');
            if (orders.success && orders.data) {
                console.log(`   Open Orders for ${this.symbol}: ${orders.data.length}`);
            }
        } catch (e) {
            this.fail('getOpenOrdersBySymbol exception', e);
        }

        // 3. Get Open Positions
        try {
            const positions = await this.client.getOpenPositions();
            if (positions.success && positions.data) {
                this.assert(true, 'getOpenPositions');
                const activePositions = positions.data.filter(p => p.isInPosition);
                console.log(`   Active Positions: ${activePositions.length}`);
                if (activePositions.length > 0) {
                    this.validateArray('Positions', activePositions, PositionSchema);
                }
            }
        } catch (e) {
            this.fail('getOpenPositions exception', e);
        }

        // 4. Get Position By Symbol
        try {
            const position = await this.client.getOpenPositionBySymbol({ symbol: this.symbol });
            if (position.success && position.data) {
                this.assert(true, 'getOpenPositionBySymbol');
                console.log(`   Position for ${this.symbol}: ${position.data.positionAmount} @ ${position.data.entryPrice}`);
            }
        } catch (e) {
            this.fail('getOpenPositionBySymbol exception', e);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ORDER CANCELLATION TESTING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testOrderCancellation() {
        console.log(`[${this.name}] Testing Order Cancellation...`);

        // 1. Cancel single order by ID (if we have any)
        if (this.context.placedOrderIds.length > 0) {
            const orderToCancel = this.context.placedOrderIds[0];
            try {
                const response = await this.client.cancelOrderById({
                    symbol: this.symbol,
                    clientOrderId: orderToCancel.clientOrderId
                });

                this.assert(response.success, 'cancelOrderById');
                if (response.success) {
                    console.log(`   Cancelled order: ${orderToCancel.clientOrderId}`);
                } else {
                    console.log(`   [WARN] cancelOrderById failed: ${response.errors}`);
                }
            } catch (e) {
                this.fail('cancelOrderById exception', e);
            }
        } else {
            console.log(`   [SKIP] No orders to cancel by ID`);
        }

        // 2. Cancel all remaining orders
        try {
            const response = await this.client.cancelAllOpenOrders({
                symbol: this.symbol
            });

            this.assert(response.success, 'cancelAllOpenOrders');
            if (response.success) {
                console.log(`   Cancelled all open orders for ${this.symbol}`);
            } else {
                console.error(`   [INFO] cancelAllOpenOrders: ${response.errors}`);
            }
        } catch (e) {
            this.fail('cancelAllOpenOrders exception', e);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CLEANUP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testCleanup() {
        console.log(`[${this.name}] Cleaning up...`);

        // Close user data stream
        if (this.context.userDataHandle) {
            try {
                this.context.userDataHandle.disconnect();
                console.log(`   User Data Stream closed`);
            } catch (e) {
                console.log(`   [WARN] Failed to close User Data Stream`);
            }
        }

        // Close any open positions (reduce to zero)
        try {
            const position = await this.client.getOpenPositionBySymbol({ symbol: this.symbol });
            if (position.success && position.data && position.data.isInPosition) {
                const qty = Math.abs(position.data.positionAmount);
                const direction = position.data.positionDirection;

                console.log(`   Closing position: ${qty} ${direction}`);

                const response = await this.client.reducePosition({
                    symbol: this.symbol,
                    positionDirection: direction,
                    quantity: qty
                });

                if (response.success) {
                    console.log(`   Position closed`);
                } else {
                    console.log(`   [WARN] Failed to close position: ${response.errors}`);
                }
            }
        } catch (e) {
            console.log(`   [WARN] Cleanup position exception`);
        }

        // Close listen key
        try {
            await this.client.closeListenKey();
        } catch (e) {
            // Ignore
        }
    }

    private summarizeUserDataEvents() {
        console.log(`\n   --- User Data Events Summary ---`);
        const eventCounts: Record<string, number> = {};
        for (const event of this.context.userDataEvents) {
            eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        }
        for (const [eventType, count] of Object.entries(eventCounts)) {
            console.log(`   ${eventType}: ${count} event(s)`);
        }
        console.log(`   Total events received: ${this.context.userDataEvents.length}`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXISTING PUBLIC/PRIVATE DATA TESTS (unchanged)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private async testPublicMarketData() {
        console.log(`[${this.name}] Testing Public Market Data...`);

        // 1. Exchange Info
        try {
            const info = await this.client.getExchangeInfo();
            this.assert(info.success, 'getExchangeInfo');
            if (info.success && info.data) {
                this.validateObject('ExchangeInfo', info.data, ExchangeInfoSchema);
                const sym = info.data[this.symbol];
                if (sym) console.log(`   [PASS] Found symbol ${this.symbol} in Info`);
                else console.warn(`   [WARN] Symbol ${this.symbol} not found in Info`);
            }
        } catch (e) {
            this.fail('getExchangeInfo exception', e);
        }

        // 2. Klines
        try {
            const klines = await this.client.getKlines({ symbol: this.symbol, interval: '1m', limit: 5 });
            this.assert(klines.success, 'getKlines');
            if (klines.success && klines.data) {
                this.validateArray('Klines', klines.data, KlineSchema);
            }
        } catch (e) {
            this.fail('getKlines exception', e);
        }

        // 3. Static Depth
        try {
            const depth = await this.client.getStaticDepth({ symbol: this.symbol, limit: 10 });
            this.assert(depth.success, 'getStaticDepth');
            if (depth.success && depth.data) {
                this.validateObject('StaticDepth', depth.data, StaticDepthSchema);
            }
        } catch (e) {
            this.fail('getStaticDepth exception', e);
        }

        // 4. Agg Trades
        try {
            const trades = await this.client.getAggTrades({ symbol: this.symbol, limit: 5 });
            this.assert(trades.success, 'getAggTrades');
        } catch (e) {
            this.fail('getAggTrades exception', e);
        }
    }

    private async testPrivateAccountData() {
        console.log(`[${this.name}] Testing Private Account Data...`);

        // 1. Balance
        try {
            const balances = await this.client.getBalance();
            this.assert(balances.success, 'getBalance');
            if (balances.success && balances.data) {
                this.validateArray('Balances', balances.data, BalanceDataSchema);
            }
        } catch (e) {
            this.fail('getBalance exception', e);
        }

        // 2. Positions
        try {
            const positions = await this.client.getOpenPositions();
            if (positions.success) {
                this.assert(true, 'getOpenPositions');
                if (positions.data) {
                    this.validateArray('Positions', positions.data, PositionSchema);
                }
            } else {
                console.error(`   - getOpenPositions: Skipped or Failed(${positions.errors})`);
            }
        } catch (e) {
            this.fail('getOpenPositions exception', e);
        }

        // 3. Open Orders
        try {
            const orders = await this.client.getOpenOrders();
            if (orders.success) {
                this.assert(true, 'getOpenOrders');
                if (orders.data) {
                    this.validateArray('Orders', orders.data, OrderSchema);
                }
            } else {
                console.error(`   - getOpenOrders: Skipped or Failed(${orders.errors})`);
            }
        } catch (e) {
            this.fail('getOpenOrders exception', e);
        }
    }

    private async testStreams() {
        console.log(`[${this.name}] Testing Streams...`);
        const streamClient = this.client as unknown as IStreamManager;

        const tasks = [
            {
                name: 'Kline Stream',
                suffix: 'CandleStickStream',
                args: [[this.symbol], '1m'],
                schema: KlineSchema
            },
            {
                name: 'Depth Stream',
                suffix: 'DepthStream',
                args: [[this.symbol]],
                schema: StreamDepthSchema
            },
            {
                name: 'BookTicker Stream',
                suffix: 'BookTickerStream',
                args: [[this.symbol]],
                schema: BookTickerDataSchema
            },
            {
                name: 'Trade Stream',
                suffix: 'TradeStream',
                args: [[this.symbol]],
                schema: TradeDataSchema
            },
            {
                name: 'Funding Stream',
                suffix: 'fundingStream', // implementation uses fundingStream() directly (core interface)
                args: [[this.symbol]],
                schema: FundingDataSchema,
                isExactName: true
            }
        ];

        for (const task of tasks) {
            await this.runStreamTest(streamClient, task);
        }
    }

    private async runStreamTest(client: IStreamManager, task: any) {
        console.log(`   - [${task.name}] Connecting...`);

        const received = await new Promise<any>((resolve) => {
            const timeout = setTimeout(() => {
                resolve('TIMEOUT');
            }, 10000);

            let method: Function | undefined;
            const isSpot = this.name.toLowerCase().includes('spot');
            let candidate = isSpot ? `spot${task.suffix}` : `futures${task.suffix}`;

            if (task.isExactName) {
                candidate = task.suffix;
            }

            if (typeof (client as any)[candidate] === 'function') {
                method = (client as any)[candidate].bind(client);
            }

            if (!method) {
                clearTimeout(timeout);
                resolve('METHOD_NOT_FOUND');
                return;
            }

            const args = [...task.args];
            let isDone = false;

            args.push((data: any) => {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeout);
                    resolve(data);
                }
            });

            try {
                method(...args).then((handle: any) => {
                    if (isDone) {
                        if (handle && handle.disconnect) {
                            setTimeout(() => handle.disconnect(), 1000);
                        }
                    } else {
                        if (handle && handle.disconnect) {
                            setTimeout(() => {
                                if (handle.disconnect) handle.disconnect();
                            }, 5000);
                        }
                    }
                }).catch((err: any) => {
                    console.error(`      Stream Connection Error:`, err);
                    if (!isDone) resolve('CONNECTION_ERROR');
                });
            } catch (e) {
                console.error(`      Stream Call Error:`, e);
                if (!isDone) resolve('CALL_ERROR');
            }
        });

        if (received === 'TIMEOUT') {
            console.error(`      [FAIL] Timeout (No data in 10s)`);
        } else if (received === 'METHOD_NOT_FOUND') {
            console.log(`      [SKIP] Method not found for ${task.suffix}`);
        } else {
            this.validateObject(task.name, received, task.schema);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UTILITIES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`   [PASS] ${message} `);
        } else {
            console.error(`   [FAIL] ${message} `);
        }
    }

    private fail(message: string, error: any) {
        console.error(`   [FAIL] ${message} `, error);
    }

    private validateObject(name: string, data: any, schema: any) {
        const result = Validator.validate(data, schema);
        if (result.valid) {
            console.log(`   [PASS] Schema Check: ${name} `);
        } else {
            console.error(`   [FAIL] Schema Check: ${name} `);
            result.errors.forEach(e => console.error(`      -> ${e} `));
        }
    }

    private validateArray(name: string, data: any[], schema: any) {
        if (!Array.isArray(data)) {
            console.error(`   [FAIL] Schema Check: ${name} (Expected Array, got ${typeof data})`);
            return;
        }
        if (data.length === 0) {
            console.log(`   [WARN] Schema Check: ${name} (Empty Array, cannot validate items)`);
            return;
        }

        const result = Validator.validate(data[0], schema);
        if (result.valid) {
            console.log(`   [PASS] Schema Check: ${name} (1st item valid)`);
        } else {
            console.error(`   [FAIL] Schema Check: ${name} `);
            result.errors.forEach(e => console.error(`      -> ${e} `));
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
