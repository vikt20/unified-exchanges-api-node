/**
 * Unified Exchange API - Core Module
 * 
 * This module provides exchange-agnostic interfaces for trading.
 * Binance is the reference implementation - all types are extracted from Binance.
 */

// ━━ Abstract Base Class ━━
export * from './AbstractExchangeBase.js';

// ━━ Interfaces ━━
export * from './IExchangeClient.js';
export * from './IStreamManager.js';
export * from './IUserDataManager.js';

// ━━ Types ━━
export * from './types.js';

// ━━ Unified Entry Point ━━
export * from './IUnifiedExchange.js';
export * from './ExchangeConnection.js';
