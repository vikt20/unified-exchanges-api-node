# Unified Exchanges API for Node.js

A powerful, unified interface for interacting with major cryptocurrency exchanges (Binance, Bybit). This package simplifies the process of connecting to exchanges, fetching market data, managing real-time streams, and executing orders across both Spot and Futures markets.

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [API Documentation](#api-documentation)
  - [ExchangeFactory](#exchangefactory)
  - [Spot & Futures Client (IExchangeClient)](#spot--futures-client-iexchangeclient)
  - [Stream Manager (IStreamManager)](#stream-manager-istreammanager)
  - [User Data Manager (IUserDataManager)](#user-data-manager-iuserdatamanager)

## Installation

```bash
npm install unified-exchanges-api-node
```

## Getting Started

The entry point for using this package is the `ExchangeFactory`. It allows you to create a unified connection to a specific exchange.

```typescript
import { ExchangeFactory, BinanceUserData } from 'unified-exchanges-api-node';

// Initialize connection (API Key & Secret are optional for public data)
const binance = ExchangeFactory.create('binance', 'YOUR_API_KEY', 'YOUR_API_SECRET');

// Access Spot, Futures, or Streams
async function main() {
    // Example: Get Spot Market Price
    const ticker = await binance.spot.getExchangeInfo();
    console.log(ticker);

    // Example: Connect to Futures Depth Stream
    await binance.streams.futuresDepthStream(['BTCUSDT'], (data) => {
        console.log('Depth Update:', data);
    });

    // Example: Subscribe to User Data Events (if keys provided)
    if (binance.userData) {
        await binance.userData.init();
        
        // Listen to position updates
        BinanceUserData.Emitter.on(BinanceUserData.POSITION_EVENT, (symbol, position) => {
           console.log(`Position Update for ${symbol}:`, position);
        });
    }
}

main();
```

## Architecture Overview

When you create a connection using `ExchangeFactory`, it returns an `IUnifiedExchange` object containing:

1.  **spot**: An `IExchangeClient` instance for Spot market operations.
2.  **futures**: An `IExchangeClient` instance for Futures market operations.
3.  **streams**: An `IStreamManager` instance for handling WebSocket streams.
4.  **userData** (Optional): An `IUserDataManager` instance for managing account state (orders, positions) via WebSockets and REST synchronization.

## API Documentation

### ExchangeFactory

Static class to instantiate exchange connections.

#### `create(exchangeId: string, apiKey?: string, apiSecret?: string): IUnifiedExchange`

Creates a new unified exchange instance.

| Parameter   | Type     | Description                                      |
| :---------- | :------- | :----------------------------------------------- |
| `exchangeId`| `string` | The exchange identifier (e.g., `'binance'`, `'bybit'`). |
| `apiKey`    | `string` | (Optional) Your API Key.                         |
| `apiSecret` | `string` | (Optional) Your API Secret.                      |

**Returns:** `IUnifiedExchange`

---

### Spot & Futures Client (`IUnifiedExchange.spot` / `.futures`)

Both properties implement the `IExchangeClient` interface.

> **Note:** Authorized (trading) methods are **NOT** implemented for the `spot` client. They are only available for `futures`.

#### Connection Management
*   `closeListenKey()`: Close the user data stream listen key.

#### Market Data (Public)
*   `getExchangeInfo()`: Returns unified exchange info with symbol details.
*   `getStaticDepth(params)`: Fetch order book snapshot.
*   `getKlines(params)`: Fetch historical candlestick data.
*   `getAggTrades(params)`: Fetch recent aggregate trades.
*   `getLatestPnlBySymbol(symbol)`: Get PnL for a specific symbol.

#### Account Data (Authorized)
*   `getBalance()`: Get account wallet balance.
*   `getPositionRisk()`: Get position risk information.
*   `getOpenPositions()`: Get all open positions.
*   `getOpenPositionBySymbol(params)`: Get open position for a specific symbol.

#### Order Management (Authorized - Futures Only)
*   `getOpenOrders()`: Fetch all active orders.
*   `getOpenOrdersBySymbol(params)`: Fetch active orders for a symbol.
*   `cancelAllOpenOrders(params)`: Cancel all orders for a symbol.
*   `cancelOrderById(params)`: Cancel a specific order by ID.

#### Order Execution (Authorized - Futures Only)
*   `marketBuy(params)` / `marketSell(params)`: Execute Market orders.
*   `limitBuy(params)` / `limitSell(params)`: Execute Limit orders.
*   `stopOrder(params)`: Execute Stop Loss orders.
*   `stopMarketOrder(params)`: Execute Stop Market orders.
*   `trailingStopOrder(params)`: Execute Trailing Stop orders.
*   `reduceLimitOrder(params)`: Place a reduce-only limit order.
*   `reducePosition(params)`: Close/Reduce a position.
*   `customOrder(orderInput)`: Send a custom order payload.

---

### Stream Manager (`IUnifiedExchange.streams`)

Implements `IStreamManager`. Handles real-time WebSocket connections.

#### Lifecycle
*   `closeAllSockets()`: Closes all active WebSocket connections.
*   `closeById(id)`: Closes a specific socket by its ID.

#### Spot WebSockets
*   `spotDepthStream(symbols, callback)`: Subscribe to order book depth updates.
*   `spotCandleStickStream(symbols, interval, callback)`: Subscribe to candlestick/kline updates.
*   `spotBookTickerStream(symbols, callback)`: Subscribe to best bid/ask (book ticker) updates.
*   `spotTradeStream(symbols, callback)`: Subscribe to real-time trade execution updates.

#### Futures WebSockets
*   `futuresDepthStream(symbols, callback)`: Subscribe to order book depth updates (Futures).
*   `futuresCandleStickStream(symbols, interval, callback)`: Subscribe to candlestick/kline updates (Futures).
*   `futuresBookTickerStream(symbols, callback)`: Subscribe to best bid/ask (book ticker) updates (Futures).
*   `futuresTradeStream(symbols, callback)`: Subscribe to real-time trade execution updates (Futures).
*   `fundingStream(symbols, callback)`: Subscribe to funding rate updates.
*   `futuresUserDataStream(callback)`: Subscribe to private account updates (order status, balance updates, etc.).

---

### User Data Manager (`IUnifiedExchange.userData`)

Implements `IUserDataManager`. Available only if API keys are provided.

The `UserData` manager acts as a **Single Source of Truth** for your account state. It initializes by fetching a REST snapshot of your Orders and Positions, and then maintains this state in real-time via a private WebSocket stream.

#### Usage (Event Subscription)

To listen for real-time updates (like order fills or position changes), you must subscribe to the **Static Events** of the specific exchange class (`BinanceUserData` or `BybitUserData`).

**Example:**

```typescript
import { ExchangeFactory, BinanceUserData, BybitUserData } from 'unified-exchanges-api-node';

const binance = ExchangeFactory.create('binance', 'KEY', 'SECRET');

if (binance.userData) {
    // 1. Initialize (Start Stream + Fetch Snapshot)
    await binance.userData.init();

    // 2. Subscribe to Static Events
    BinanceUserData.Emitter.on(BinanceUserData.POSITION_EVENT, (symbol, position) => {
        console.log(`[Binance] Position updated for ${symbol}`, position);
    });

    BinanceUserData.Emitter.on(BinanceUserData.ORDER_EVENT, (symbol, orders) => {
        console.log(`[Binance] Order list updated for ${symbol}`, orders);
    });
}
```

#### Event Reference

All UserData classes (`BinanceUserData`, `BybitUserData`) export the following static event constants:

| Event Constant | Description | Payload Arguments |
| :--- | :--- | :--- |
| `POSITION_EVENT` | Emitted when a position is updated. | `(symbol: string, position: PositionData)` |
| `ORDER_EVENT` | Emitted when the order list changes. | `(symbol: string, orders: OrderData[])` |
| `TRIGGER_POSITION_EVENT` | Emit this to **request** current position. | `(symbol: string)` |
| `TRIGGER_ORDER_EVENT` | Emit this to **request** current orders. | `(symbol: string)` |

**Manual Trigger Example:**

If you need to get the current state for a symbol on-demand via the event system:
```typescript
// Request state check
BinanceUserData.Emitter.emit(BinanceUserData.TRIGGER_POSITION_EVENT, 'BTCUSDT');

// ... The 'POSITION_EVENT' will be emitted immediately with the cached data.
```

#### Class Properties & Methods

*   `userData`: Holds the current synchronous state:
    *   `positions`: Array of `PositionData`.
    *   `orders`: Array of `OrderData`.
*   `init()`: Connects the WebSocket and fetches initial snapshots.
*   `requestAllOrders()`: Force-refresh all open orders from API.
*   `requestAllPositions()`: Force-refresh all open positions from API.
