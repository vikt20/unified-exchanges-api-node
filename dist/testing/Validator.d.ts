/**
 * Custom Schema Validation System
 * strict runtime type checking without external dependencies.
 */
export type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any' | 'undefined' | 'null';
export interface SchemaField {
    type: SchemaType | SchemaType[];
    required?: boolean;
    items?: SchemaDefinition;
    properties?: Record<string, SchemaField>;
    enum?: any[];
}
export type SchemaDefinition = SchemaField;
export declare class Validator {
    static validate(data: any, schema: SchemaDefinition, path?: string): {
        valid: boolean;
        errors: string[];
    };
    private static getType;
    private static isTypeAllowed;
}
export declare const KlineSchema: SchemaDefinition;
export declare const StaticDepthSchema: SchemaDefinition;
export declare const ExtractedInfoSchema: SchemaDefinition;
export declare const ExchangeInfoSchema: SchemaDefinition;
export declare const BalanceDataSchema: SchemaDefinition;
export declare const PositionSchema: SchemaDefinition;
export declare const AccountDataSchema: SchemaDefinition;
export declare const OrderSchema: SchemaDefinition;
export declare const TradeDataSchema: SchemaDefinition;
export declare const BookTickerDataSchema: SchemaDefinition;
export declare const StreamDepthSchema: SchemaDefinition;
export declare const FundingDataSchema: SchemaDefinition;
export declare const UserDataEventSchema: SchemaDefinition;
export declare const OrderRequestResponseSchema: SchemaDefinition;
//# sourceMappingURL=Validator.d.ts.map