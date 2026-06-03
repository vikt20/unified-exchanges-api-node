# Bitget API Notes

Bitget is implemented through the V2 classic REST and WebSocket APIs.

- Authenticated REST and private WebSocket calls require `apiKey`, `apiSecret`, and `apiPassphrase`.
- Futures default to `USDT-FUTURES` with margin coin `USDT`.
- Spot market buy uses Bitget `size` as quote amount, while spot market sell and limit orders use base amount. The unified `quantity` field cannot express both units.
- Futures hedge mode has Bitget-specific `tradeSide=open|close` semantics that the shared interface does not expose. Unified reduce methods use `reduceOnly` and one-way-compatible payloads.
- Bitget may omit `orderId` for some reduce-only flows. The implementation always sends a generated `clientOid` and preserves it in unified responses.
- Trailing stop uses Bitget plan orders and requires `activatePrice`; without it the method returns an unsupported mapping error.

