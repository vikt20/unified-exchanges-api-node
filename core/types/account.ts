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

// ━━ Position Data ━━
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
    raw_data?: any
}

// ━━ Position Risk Data (Full Position Detail) ━━
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

// ━━ Balance Data ━━
export interface BalanceData {
    asset: string;
    balance: string;
    crossWalletBalance: string;
    balanceChange: string;
}

// ━━ Account Data ━━
export interface AccountData {
    balances: BalanceData[] | undefined;
    positions: PositionData[] | undefined;
}
