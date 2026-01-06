"use strict";
/**
 * Unified Exchange API - Core Module
 *
 * This module provides exchange-agnostic interfaces for trading.
 * Binance is the reference implementation - all types are extracted from Binance.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// ━━ Abstract Base Class ━━
__exportStar(require("./AbstractExchangeBase.js"), exports);
// ━━ Interfaces ━━
__exportStar(require("./IExchangeClient.js"), exports);
__exportStar(require("./IStreamManager.js"), exports);
__exportStar(require("./IUserDataManager.js"), exports);
// ━━ Types ━━
__exportStar(require("./types.js"), exports);
// ━━ Unified Entry Point ━━
__exportStar(require("./IUnifiedExchange.js"), exports);
__exportStar(require("./ExchangeConnection.js"), exports);
