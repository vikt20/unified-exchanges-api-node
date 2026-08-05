import ws from 'ws';
export class BybitWsUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BybitWsUnavailableError';
    }
}
/**
 * Authenticated Bybit V5 WebSocket order-entry client.
 *
 * The connection is authenticated once. Individual order requests then carry
 * only Bybit's timestamp/receive-window header and one request object in args.
 */
export class BybitWebsocketApiClient {
    config;
    socket = null;
    online = false;
    destroyed = false;
    connectingPromise = null;
    rejectConnecting = null;
    reconnectTimer = null;
    pingInterval = null;
    requestCounter = 1;
    pending = new Map();
    reconnectDelayMs = 3000;
    pingIntervalMs = 20000;
    constructor(config) {
        this.config = config;
        void this.connect().catch(() => {
            // The caller observes availability through ensureConnected().
        });
    }
    async ensureConnected() {
        if (!this.isOnline())
            await this.connect();
    }
    isOnline() {
        return this.online && this.socket?.readyState === ws.OPEN;
    }
    async request(method, params, options) {
        if (!this.isOnline() || !this.socket) {
            throw new BybitWsUnavailableError('WebSocket API is not authenticated');
        }
        const timeoutMs = options?.timeoutMs ?? 5000;
        const reqId = String(this.requestCounter++);
        const requestParams = { ...params };
        Object.keys(requestParams).forEach((key) => requestParams[key] === undefined && delete requestParams[key]);
        const payload = {
            reqId,
            header: {
                'X-BAPI-TIMESTAMP': String(this.config.getTimestamp()),
                'X-BAPI-RECV-WINDOW': String(this.config.getRecvWindow())
            },
            op: method,
            args: [requestParams]
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(reqId);
                reject(new Error(`Bybit WS API request timeout for method ${method}`));
            }, timeoutMs);
            this.pending.set(reqId, {
                timeout,
                resolve: (responsePayload) => resolve(this.parseWsResponse(responsePayload)),
                reject
            });
            this.socket.send(JSON.stringify(payload), (error) => {
                if (!error)
                    return;
                clearTimeout(timeout);
                this.pending.delete(reqId);
                reject(new BybitWsUnavailableError(error.message || 'Failed to send WS API request'));
            });
        });
    }
    destroy() {
        this.destroyed = true;
        this.online = false;
        this.clearReconnectTimer();
        this.clearPingInterval();
        this.clearPendingWithError('WebSocket API client destroyed');
        this.rejectConnecting?.(new BybitWsUnavailableError('WebSocket API client destroyed'));
        this.cleanupSocket();
        this.connectingPromise = null;
    }
    async connect() {
        if (this.destroyed) {
            throw new BybitWsUnavailableError('WebSocket API client was destroyed');
        }
        if (this.isOnline())
            return;
        if (this.connectingPromise)
            return this.connectingPromise;
        this.connectingPromise = new Promise((resolve, reject) => {
            this.clearReconnectTimer();
            this.clearPingInterval();
            this.cleanupSocket();
            let settled = false;
            let authenticationTimeout = null;
            const rejectConnection = (error) => {
                if (settled)
                    return;
                settled = true;
                if (authenticationTimeout)
                    clearTimeout(authenticationTimeout);
                this.rejectConnecting = null;
                this.connectingPromise = null;
                reject(error);
            };
            this.rejectConnecting = rejectConnection;
            try {
                this.socket = new ws(this.config.getUrl());
            }
            catch (error) {
                rejectConnection(new BybitWsUnavailableError(error?.message || 'Failed to create WebSocket'));
                this.scheduleReconnect();
                return;
            }
            this.socket.on('open', () => {
                const expires = this.config.getTimestamp() + 10000;
                const signature = this.config.sign(`GET/realtime${expires}`);
                authenticationTimeout = setTimeout(() => {
                    rejectConnection(new BybitWsUnavailableError('WebSocket API authentication timeout'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                }, 5000);
                this.socket?.send(JSON.stringify({
                    op: 'auth',
                    args: [this.config.getApiKey(), expires, signature]
                }), (error) => {
                    if (!error)
                        return;
                    rejectConnection(new BybitWsUnavailableError(error.message || 'Failed to authenticate WebSocket API'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                });
            });
            this.socket.on('message', (rawData) => {
                let payload;
                try {
                    payload = JSON.parse(rawData.toString());
                }
                catch {
                    return;
                }
                if (payload.op === 'auth') {
                    if (payload.retCode === 0 || payload.retCode === 20001) {
                        this.online = true;
                        this.startPingInterval();
                        if (!settled) {
                            settled = true;
                            if (authenticationTimeout)
                                clearTimeout(authenticationTimeout);
                            this.rejectConnecting = null;
                            this.connectingPromise = null;
                            resolve();
                        }
                    }
                    else {
                        const message = payload.retMsg || `Bybit WS API authentication failed (${payload.retCode ?? 'UNKNOWN'})`;
                        rejectConnection(new BybitWsUnavailableError(message));
                        this.cleanupSocket();
                        this.scheduleReconnect();
                    }
                    return;
                }
                if (payload.op === 'pong')
                    return;
                const reqId = payload.reqId;
                if (!reqId)
                    return;
                const request = this.pending.get(reqId);
                if (!request)
                    return;
                clearTimeout(request.timeout);
                this.pending.delete(reqId);
                request.resolve(payload);
            });
            this.socket.on('ping', (data) => {
                this.socket?.pong(data);
            });
            this.socket.on('close', () => {
                this.online = false;
                this.clearPingInterval();
                rejectConnection(new BybitWsUnavailableError('WebSocket API connection closed before authentication'));
                this.clearPendingWithError('WebSocket API connection closed');
                this.scheduleReconnect();
            });
            this.socket.on('error', (error) => {
                this.online = false;
                rejectConnection(new BybitWsUnavailableError(error?.message || 'WebSocket API connection error'));
            });
        });
        return this.connectingPromise;
    }
    parseWsResponse(payload) {
        if (payload.retCode !== undefined && payload.retCode !== 0) {
            const errorMessage = payload.retMsg || `Bybit WS API error (${payload.retCode})`;
            return this.config.formattedResponse({ errors: `${payload.retCode}: ${errorMessage}` });
        }
        return this.config.formattedResponse({ data: payload.data });
    }
    startPingInterval() {
        this.clearPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.socket?.readyState === ws.OPEN) {
                this.socket.send(JSON.stringify({ op: 'ping' }));
            }
        }, this.pingIntervalMs);
    }
    scheduleReconnect() {
        if (this.destroyed || this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect().catch(() => {
                // A later reconnect attempt or ensureConnected() will retry.
            });
        }, this.reconnectDelayMs);
    }
    clearReconnectTimer() {
        if (!this.reconnectTimer)
            return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }
    clearPingInterval() {
        if (!this.pingInterval)
            return;
        clearInterval(this.pingInterval);
        this.pingInterval = null;
    }
    clearPendingWithError(reason) {
        for (const [reqId, request] of this.pending.entries()) {
            clearTimeout(request.timeout);
            // The server may already have accepted an in-flight order. Do not
            // classify this ambiguous state as safe for an automatic REST retry.
            request.reject(new Error(reason));
            this.pending.delete(reqId);
        }
    }
    cleanupSocket() {
        if (!this.socket)
            return;
        this.socket.removeAllListeners();
        this.socket.terminate();
        this.socket = null;
    }
}
