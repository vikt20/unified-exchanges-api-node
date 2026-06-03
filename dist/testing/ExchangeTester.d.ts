import { IExchangeClient } from '../core/IExchangeClient.js';
export declare class ExchangeTester {
    private client;
    private name;
    private symbol;
    private context;
    constructor(client: IExchangeClient, name: string, testSymbol: string);
    runAllTests(): Promise<void>;
    /**
     * Comprehensive authenticated testing sequence:
     * 1. Start User Data Stream
     * 2. Place Orders
     * 3. Query Orders/Positions
     * 4. Cancel Orders
     * 5. Cleanup
     */
    runAuthenticatedTests(): Promise<void>;
    private testUserDataStream;
    private testOrderPlacement;
    private testOrderQueryMethods;
    private testOrderCancellation;
    private testCleanup;
    private summarizeUserDataEvents;
    private testPublicMarketData;
    private testPrivateAccountData;
    private testStreams;
    private runStreamTest;
    private closeAllStreams;
    private assert;
    private fail;
    private validateObject;
    private validateArray;
    private sleep;
}
//# sourceMappingURL=ExchangeTester.d.ts.map