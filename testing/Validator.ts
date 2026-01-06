
/**
 * Custom Schema Validation System
 * strict runtime type checking without external dependencies.
 */

export type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any' | 'undefined' | 'null';

export interface SchemaField {
    type: SchemaType | SchemaType[]; // Allow multiple types e.g. ['string', 'undefined']
    required?: boolean;
    items?: SchemaDefinition; // For arrays
    properties?: Record<string, SchemaField>; // For objects
    enum?: any[]; // Allowable values
}

export type SchemaDefinition = SchemaField;

export class Validator {

    public static validate(data: any, schema: SchemaDefinition, path: string = 'root'): { valid: boolean, errors: string[] } {
        const errors: string[] = [];

        // 1. Check null/undefined/requirement
        if (data === undefined || data === null) {
            if (schema.required !== false && !this.isTypeAllowed('undefined', schema.type) && !this.isTypeAllowed('null', schema.type)) {
                errors.push(`Missing required field at '${path}'`);
                return { valid: false, errors };
            }
            return { valid: true, errors: [] };
        }

        // 2. Check Type
        const currentType = this.getType(data);
        if (!this.isTypeAllowed(currentType, schema.type)) {
            // Special case: 'any' allows everything
            if (!this.isTypeAllowed('any', schema.type)) {
                errors.push(`Invalid type at '${path}': expected '${Array.isArray(schema.type) ? schema.type.join('|') : schema.type}', got '${currentType}'`);
                // Fail immediately on type mismatch usually means deeper checks fail too
                return { valid: false, errors };
            }
        }

        // 3. Enum Check
        if (schema.enum && !schema.enum.includes(data)) {
            errors.push(`Invalid value at '${path}': expected one of [${schema.enum.join(', ')}], got '${data}'`);
        }

        // 4. Object Properties Recursion
        if (currentType === 'object' && schema.properties) {
            for (const key in schema.properties) {
                const fieldSchema = schema.properties[key];
                const result = this.validate(data[key], fieldSchema, `${path}.${key}`);
                if (!result.valid) {
                    errors.push(...result.errors);
                }
            }
        }

        // 5. Array Items Recursion
        if (currentType === 'array' && schema.items) {
            for (let i = 0; i < data.length; i++) {
                const result = this.validate(data[i], schema.items, `${path}[${i}]`);
                if (!result.valid) {
                    errors.push(...result.errors);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    private static getType(value: any): SchemaType {
        if (Array.isArray(value)) return 'array';
        if (value === null) return 'null';
        return typeof value as SchemaType;
    }

    private static isTypeAllowed(actual: SchemaType, expected: SchemaType | SchemaType[]): boolean {
        if (Array.isArray(expected)) {
            return expected.includes(actual) || expected.includes('any');
        }
        return expected === actual || expected === 'any';
    }
}

// --- Core Schemas ---
// Defining schemas strictly based on core/types/*.ts

// From core/types/market.ts
export const KlineSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        time: { type: 'number', required: true },
        open: { type: 'number', required: true },
        high: { type: 'number', required: true },
        low: { type: 'number', required: true },
        close: { type: 'number', required: true },
        volume: { type: 'number', required: true },
        trades: { type: 'number', required: true }
    }
};

export const StaticDepthSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        lastUpdateId: { type: 'number', required: true },
        bids: {
            type: 'array',
            required: true,
            items: {
                type: 'array',
                required: true
                // Tuple: [price, qty] as strings
            }
        },
        asks: { type: 'array', required: true, items: { type: 'array', required: true } }
    }
};

// From core/types/exchange.ts
export const SymbolInfoSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        status: { type: 'string', required: true },
        baseAsset: { type: 'string', required: true },
        quoteAsset: { type: 'string', required: true },
        baseAssetPrecision: { type: 'number', required: false },
        quoteAssetPrecision: { type: 'number', required: false },
        orderTypes: { type: 'array', required: false, items: { type: 'string', required: true } },
        filters: { type: 'array', required: false, items: { type: 'object', required: false } }
        // allow generic keys
    }
};

export const ExchangeInfoSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbols: { type: 'array', required: true, items: SymbolInfoSchema },
        serverTime: { type: 'number', required: false },
        timezone: { type: 'string', required: false }
    }
};

// From core/types/account.ts
export const BalanceDataSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        asset: { type: 'string', required: true },
        balance: { type: 'string', required: true }, // NOTE: Type definition says string
        crossWalletBalance: { type: 'string', required: true }, // Type definition says string
        balanceChange: { type: 'string', required: true } // Type definition says string
    }
};

export const PositionSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        positionAmount: { type: 'number', required: true },
        entryPrice: { type: 'number', required: true },
        positionDirection: { type: 'string', required: true, enum: ['LONG', 'SHORT', 'BOTH'] },
        isInPosition: { type: 'boolean', required: true },
        unrealizedPnL: { type: 'number', required: true }
    }
};

export const AccountDataSchema: SchemaDefinition = {
    type: 'object', // AccountData wrapper
    required: true,
    properties: {
        balances: { type: ['array', 'undefined'], required: false, items: BalanceDataSchema },
        positions: { type: ['array', 'undefined'], required: false, items: PositionSchema }
    }
};

// From core/types/orders.ts
// OrderData is complex, defining mandatory fields
export const OrderSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        clientOrderId: { type: 'string', required: true },
        side: { type: 'string', required: true, enum: ['BUY', 'SELL'] },
        orderType: { type: 'string', required: true },
        timeInForce: { type: 'string', required: true },
        originalQuantity: { type: 'number', required: true },
        originalPrice: { type: 'number', required: true },
        averagePrice: { type: 'number', required: true },
        stopPrice: { type: 'number', required: true },
        executionType: { type: 'string', required: true },
        orderStatus: { type: 'string', required: true },
        orderId: { type: ['number', 'string'], required: true },
        orderLastFilledQuantity: { type: 'number', required: true },
        orderFilledAccumulatedQuantity: { type: 'number', required: true },
        lastFilledPrice: { type: 'number', required: true },
        commissionAsset: { type: 'string', required: true },
        orderTradeTime: { type: 'number', required: true },
        tradeId: { type: 'number', required: true },
        isMakerSide: { type: 'boolean', required: true },
        isReduceOnly: { type: 'boolean', required: true },
        workingType: { type: 'string', required: true },
        originalOrderType: { type: 'string', required: true },
        positionSide: { type: 'string', required: true },
        closeAll: { type: 'boolean', required: true },
        activationPrice: { type: 'string', required: true },
        callbackRate: { type: 'string', required: true },
        realizedProfit: { type: 'string', required: true },
        isAlgoOrder: { type: 'boolean', required: true }
    }
};

export const TradeDataSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        price: { type: 'number', required: true },
        quantity: { type: 'number', required: true },
        tradeTime: { type: 'number', required: true },
        orderType: { type: 'string', required: true, enum: ['BUY', 'SELL'] }
    }
};

export const BookTickerDataSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        bestBid: { type: 'number', required: true },
        bestBidQty: { type: 'number', required: true },
        bestAsk: { type: 'number', required: true },
        bestAskQty: { type: 'number', required: true }
    }
};

export const StreamDepthSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        symbol: { type: 'string', required: true },
        // DepthData in core/types/market.ts is defined as Array<[string, string]>
        // This corresponds to an array of arrays in runtime
        asks: {
            type: 'array',
            required: true,
            items: { type: 'array', required: true, items: { type: 'string', required: true } }
        },
        bids: {
            type: 'array',
            required: true,
            items: { type: 'array', required: true, items: { type: 'string', required: true } }
        }
    }
};

// ━━ User Data Event Schema ━━
// This schema validates the complete UserData structure including nested accountData and orderData
export const UserDataEventSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        event: { type: 'string', required: true, enum: ['ACCOUNT_UPDATE', 'ORDER_TRADE_UPDATE', 'ALGO_UPDATE', 'TRADE_LITE', 'listenKeyExpired'] },
        accountData: {
            type: ['object', 'undefined'],
            required: false,
            properties: {
                balances: { type: ['array', 'undefined'], required: false, items: BalanceDataSchema },
                positions: { type: ['array', 'undefined'], required: false, items: PositionSchema }
            }
        },
        orderData: {
            type: ['object', 'undefined'],
            required: false,
            properties: {
                symbol: { type: 'string', required: true },
                clientOrderId: { type: 'string', required: true },
                side: { type: 'string', required: true, enum: ['BUY', 'SELL'] },
                orderType: { type: 'string', required: true },
                timeInForce: { type: 'string', required: true },
                originalQuantity: { type: 'number', required: true },
                originalPrice: { type: 'number', required: true },
                averagePrice: { type: 'number', required: true },
                stopPrice: { type: 'number', required: true },
                executionType: { type: 'string', required: true },
                orderStatus: {
                    type: 'string',
                    required: true,
                    enum: ['NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'PENDING_CANCEL', 'REJECTED', 'EXPIRED', 'PENDING', 'TRIGGERED', 'FINISHED']
                },
                orderId: { type: ['number', 'string'], required: true },
                orderLastFilledQuantity: { type: 'number', required: true },
                orderFilledAccumulatedQuantity: { type: 'number', required: true },
                lastFilledPrice: { type: 'number', required: true },
                commissionAsset: { type: 'string', required: true },
                commission: { type: 'string', required: false }, // Optional per OrderData interface
                orderTradeTime: { type: 'number', required: true },
                tradeId: { type: 'number', required: true },
                bidsNotional: { type: 'string', required: false },
                askNotional: { type: 'string', required: false },
                isMakerSide: { type: 'boolean', required: true },
                isReduceOnly: { type: 'boolean', required: true },
                workingType: { type: 'string', required: true },
                originalOrderType: { type: 'string', required: true },
                positionSide: { type: 'string', required: true, enum: ['BOTH', 'LONG', 'SHORT'] },
                closeAll: { type: 'boolean', required: true },
                activationPrice: { type: 'string', required: true },
                callbackRate: { type: 'string', required: true },
                realizedProfit: { type: 'string', required: true },
                isAlgoOrder: { type: 'boolean', required: true }
            }
        }
    }
};

// ━━ Order Request Response Schema ━━
export const OrderRequestResponseSchema: SchemaDefinition = {
    type: 'object',
    required: true,
    properties: {
        orderId: { type: ['number', 'string'], required: true },
        symbol: { type: 'string', required: true },
        status: { type: 'string', required: true },
        clientOrderId: { type: 'string', required: true },
        price: { type: 'string', required: true },
        origQty: { type: 'string', required: true },
        timeInForce: { type: 'string', required: true },
        type: { type: 'string', required: true },
        reduceOnly: { type: 'boolean', required: true },
        closePosition: { type: 'boolean', required: true },
        side: { type: 'string', required: true, enum: ['BUY', 'SELL'] },
        positionSide: { type: 'string', required: true },
        workingType: { type: 'string', required: true },
        origType: { type: 'string', required: true }
    }
};
