import ws from 'ws';
export class OkxWsUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OkxWsUnavailableError';
    }
}
/** Authenticated OKX V5 private WebSocket order-entry client. */
export class OkxWebsocketApiClient {
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
            // Availability is reported through ensureConnected().
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
            throw new OkxWsUnavailableError('WebSocket API is not authenticated');
        }
        const timeoutMs = options?.timeoutMs ?? 5000;
        const id = String(this.requestCounter++);
        const requestParams = { ...params };
        Object.keys(requestParams).forEach((key) => requestParams[key] === undefined && delete requestParams[key]);
        const payload = { id, op: method, args: [requestParams] };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`OKX WS API request timeout for operation ${method}`));
            }, timeoutMs);
            this.pending.set(id, {
                timeout,
                resolve: (responsePayload) => resolve(this.parseWsResponse(responsePayload)),
                reject
            });
            this.socket.send(JSON.stringify(payload), (error) => {
                if (!error)
                    return;
                clearTimeout(timeout);
                this.pending.delete(id);
                reject(new OkxWsUnavailableError(error.message || 'Failed to send WS API request'));
            });
        });
    }
    destroy() {
        this.destroyed = true;
        this.online = false;
        this.clearReconnectTimer();
        this.clearPingInterval();
        this.clearPendingWithError('WebSocket API client destroyed');
        this.rejectConnecting?.(new OkxWsUnavailableError('WebSocket API client destroyed'));
        this.cleanupSocket();
        this.connectingPromise = null;
    }
    async connect() {
        if (this.destroyed)
            throw new OkxWsUnavailableError('WebSocket API client was destroyed');
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
                rejectConnection(new OkxWsUnavailableError(error?.message || 'Failed to create WebSocket'));
                this.scheduleReconnect();
                return;
            }
            this.socket.on('open', () => {
                const timestamp = Math.floor(this.config.getTimestamp() / 1000).toString();
                const sign = this.config.sign(`${timestamp}GET/users/self/verify`);
                authenticationTimeout = setTimeout(() => {
                    rejectConnection(new OkxWsUnavailableError('WebSocket API authentication timeout'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                }, 5000);
                this.socket?.send(JSON.stringify({
                    op: 'login',
                    args: [{
                            apiKey: this.config.getApiKey(),
                            passphrase: this.config.getPassphrase(),
                            timestamp,
                            sign
                        }]
                }), (error) => {
                    if (!error)
                        return;
                    rejectConnection(new OkxWsUnavailableError(error.message || 'Failed to authenticate WebSocket API'));
                    this.cleanupSocket();
                    this.scheduleReconnect();
                });
            });
            this.socket.on('message', (rawData) => {
                const message = rawData.toString();
                if (message === 'pong')
                    return;
                let payload;
                try {
                    payload = JSON.parse(message);
                }
                catch {
                    return;
                }
                if (payload.event === 'login' || (payload.event === 'error' && !settled)) {
                    if (payload.code === '0') {
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
                        rejectConnection(new OkxWsUnavailableError(payload.msg || `OKX WS API authentication failed (${payload.code ?? 'UNKNOWN'})`));
                        this.cleanupSocket();
                        this.scheduleReconnect();
                    }
                    return;
                }
                const id = payload.id;
                if (!id)
                    return;
                const request = this.pending.get(id);
                if (!request)
                    return;
                clearTimeout(request.timeout);
                this.pending.delete(id);
                request.resolve(payload);
            });
            this.socket.on('ping', (data) => this.socket?.pong(data));
            this.socket.on('close', () => {
                this.online = false;
                this.clearPingInterval();
                rejectConnection(new OkxWsUnavailableError('WebSocket API connection closed before authentication'));
                this.clearPendingWithError('WebSocket API connection closed');
                this.scheduleReconnect();
            });
            this.socket.on('error', (error) => {
                this.online = false;
                rejectConnection(new OkxWsUnavailableError(error?.message || 'WebSocket API connection error'));
            });
        });
        return this.connectingPromise;
    }
    parseWsResponse(payload) {
        if (payload.code !== undefined && payload.code !== '0') {
            return this.config.formattedResponse({ errors: `${payload.code}: ${payload.msg || 'OKX WS API request failed'}` });
        }
        const data = Array.isArray(payload.data) ? payload.data : [];
        const failedItem = data.find((item) => item.sCode !== undefined && item.sCode !== '0');
        if (failedItem) {
            return this.config.formattedResponse({ errors: `${failedItem.sCode}: ${failedItem.sMsg || 'OKX order request failed'}` });
        }
        return this.config.formattedResponse({ data: data });
    }
    startPingInterval() {
        this.clearPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.socket?.readyState === ws.OPEN)
                this.socket.send('ping');
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
        for (const [id, request] of this.pending.entries()) {
            clearTimeout(request.timeout);
            // The order may already have reached OKX, so an automatic REST retry
            // would risk submitting the same intent twice.
            request.reject(new Error(reason));
            this.pending.delete(id);
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
