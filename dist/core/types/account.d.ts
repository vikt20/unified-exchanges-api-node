/**
 * Account Types
 *
 * Unified account and position type definitions.
 */
import { PositionDirection, PositionSide } from './common.js';
export type MarginMode = 'cross' | 'isolated';
export interface SymbolLeverageData {
    symbol: string;
    leverage: number;
    maxLeverage: number;
}
export interface SymbolMarginModeData {
    symbol: string;
    marginMode: MarginMode;
}
export interface PositionData {
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    liquidationPrice: number;
    leverage: number;
    marginMode: MarginMode;
    positionDirection: PositionDirection;
    isInPosition: boolean;
    unrealizedPnL: number;
    raw_data?: any;
}
export interface PositionRiskData {
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnL: number;
    liquidationPrice: number;
    leverage: number;
    marginType: MarginMode;
    isolatedMargin: number;
    positionSide: PositionSide;
    notionalValue: number;
    maxNotionalValue: number;
    isAutoAddMargin: boolean;
    updateTime: number;
}
export interface BalanceData {
    asset: string;
    balance: string;
    crossWalletBalance: string;
    balanceChange: string;
}
export interface AccountData {
    balances: BalanceData[] | undefined;
    positions: PositionData[] | undefined;
}
//# sourceMappingURL=account.d.ts.map