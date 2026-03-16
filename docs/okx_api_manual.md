# OKX V5 REST API Manual (Distilled for Unified Exchange API)

Base URL: `https://www.okx.com`

This manual provides a summarized overview of the OKX v5 REST API endpoints that are relevant for our `IExchangeClient` implementation.

## 1. Market Data Endpoints
- **Get Instruments**: `GET /api/v5/public/instruments` (InstType: SPOT, SWAP, FUTURES, OPTION)
- **Get Order Book**: `GET /api/v5/market/books` (instId, sz)
- **Get Klines/Candlesticks**: `GET /api/v5/market/candles` or `GET /api/v5/market/history-candles` (instId, bar)
- **Get Recent Trades**: `GET /api/v5/market/trades` (instId, limit)
- **Get Tickers**: `GET /api/v5/market/ticker` (instId)

## 2. Account Data Endpoints
- **Get Balance**: `GET /api/v5/account/balance` (ccy)
- **Get Positions**: `GET /api/v5/account/positions` (instType, instId)
  - Returns position arrays including `pos` (size), `posSide` (long/short/net), `avgPx`, `upl`, `liqPx`, `notionalUsd`.
- **Get Account Configuration**: `GET /api/v5/account/config` (useful for checking account mode: Simple, Single-currency, Multi-currency, Portfolio).
- **Position Risk**: Can be derived from positions endpoint or `GET /api/v5/account/account-position-risk`.

## 3. Trade Execution Endpoints
- **Place Order**: `POST /api/v5/trade/order`
  - Parameters: `instId`, `tdMode` (cross/isolated/cash), `side` (buy/sell), `ordType` (market, limit, post_only, foc, ioc, optimal_limit_ioc), `sz` (size), `px` (price).
- **Place Algo Order (Stop Loss / Take Profit / Trailing Stop)**: `POST /api/v5/trade/order-algo`
  - Parameters: `ordType` (conditional, oco, trigger, move_order_stop), `triggerPxX`, etc.
- **Cancel Order**: `POST /api/v5/trade/cancel-order` (instId, ordId or clOrdId)
- **Cancel Algo Order**: `POST /api/v5/trade/cancel-algos`
- **Get Open Orders**: `GET /api/v5/trade/orders-pending` (instType, instId)
- **Amend Order**: `POST /api/v5/trade/amend-order`

## 4. Authentication
- Headers required:
  - `OK-ACCESS-KEY`
  - `OK-ACCESS-SIGN`
  - `OK-ACCESS-TIMESTAMP` (ISO 8601 string)
  - `OK-ACCESS-PASSPHRASE` (OKX requires a passphrase in addition to the API key and secret)
- Signature is a Base64 encoded HMAC-SHA256 of `timestamp + method + requestPath + body` using the secret key.
