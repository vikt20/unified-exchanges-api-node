export const DEFAULT_EXCHANGE_INFO_POLLING_INTERVAL_MS = 10 * 60 * 1000;
export async function createExchangeInfoPollingStream(fetchExchangeInfo, callback, register, statusCallback, options) {
    const id = `exchange-info-${Math.random().toString(36).slice(2)}`;
    const intervalMs = options?.pollingIntervalMs ?? DEFAULT_EXCHANGE_INFO_POLLING_INTERVAL_MS;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        throw new RangeError('pollingIntervalMs must be a positive finite number');
    }
    let active = true;
    const poll = async () => {
        try {
            const response = await fetchExchangeInfo();
            if (!active)
                return;
            if (!response.success || !response.data) {
                statusCallback?.('ERROR');
                return;
            }
            Object.values(response.data).forEach(item => callback(item));
        }
        catch {
            if (active)
                statusCallback?.('ERROR');
        }
    };
    const interval = setInterval(() => void poll(), intervalMs);
    const disconnect = () => {
        if (!active)
            return;
        active = false;
        clearInterval(interval);
        statusCallback?.('CLOSE');
    };
    register({ id, disconnect });
    await poll();
    if (active)
        statusCallback?.('OPEN');
    return { id, disconnect };
}
