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
import { ExchangeFactory } from 'unified-exchanges-api-node';

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

#### Public Streams
*   `spotDepthStream(symbols, callback)` / `futuresDepthStream(...)`: Subscribe to order book depth updates.
*   `spotCandleStickStream(symbols, interval, callback)` / `futuresCandleStickStream(...)`: Subscribe to candlestick/kline updates.
*   `spotBookTickerStream(symbols, callback)` / `futuresBookTickerStream(...)`: Subscribe to best bid/ask (book ticker) updates.
*   `spotTradeStream(symbols, callback)` / `futuresTradeStream(...)`: Subscribe to real-time trade execution updates.
*   `fundingStream(symbols, callback)`: Subscribe to funding rate updates.

#### User Streams
*   `futuresUserDataStream(callback)`: Subscribe to private account updates (order status, balance updates, etc.).

---

### User Data Manager (`IUnifiedExchange.userData`)

Implements `IUserDataManager`. Available only if API keys are provided. It acts as a **Single Source of Truth** for specific user state, keeping local state in sync using both REST snapshots and WebSockets.

#### Properties
*   `userData`: Holds the current state:
    *   `positions`: Array of `PositionData`.
    *   `orders`: Array of `OrderData`.

#### Methods
*   `init()`: Initializes the manager. Starts the User Data stream and fetches initial REST snapshots.
*   `requestAllOrders()`: Manually re-fetches all open orders from the exchange to sync local state.
*   `requestAllPositions()`: Manually re-fetches all open positions from the exchange to sync local state.
