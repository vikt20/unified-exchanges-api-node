/**
 * Account Types
 *
 * Unified account and position type definitions.
 */
import { PositionDirection, PositionSide } from './common.js';
export interface PositionData {
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    positionDirection: PositionDirection;
    isInPosition: boolean;
    unrealizedPnL: number;
}
export interface PositionRiskData {
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnL: number;
    liquidationPrice: number;
    leverage: number;
    marginType: 'cross' | 'isolated';
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