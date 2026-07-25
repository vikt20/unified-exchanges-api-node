const HOUR_MS = 60 * 60 * 1000;
const REFRESH_WINDOW_MS = 60 * 1000;
/**
 * Enriches funding events without polling. The first event initializes the
 * interval; subsequent refreshes are attempted only during minute 00 UTC.
 */
export function createFundingIntervalCallback(callback, fetchInterval, fetcher, isActive = () => true) {
    const intervals = new Map();
    const refreshedHours = new Map();
    const inFlight = new Map();
    return (data) => {
        if (!isActive())
            return;
        if (!fetchInterval || data.interval !== undefined) {
            callback(data);
            return;
        }
        const now = Date.now();
        const hour = Math.floor(now / HOUR_MS);
        const isRefreshWindow = now % HOUR_MS < REFRESH_WINDOW_MS;
        const cachedInterval = intervals.get(data.symbol);
        const shouldFetch = cachedInterval === undefined
            || (isRefreshWindow && refreshedHours.get(data.symbol) !== hour);
        if (!shouldFetch) {
            callback({ ...data, interval: cachedInterval });
            return;
        }
        refreshedHours.set(data.symbol, hour);
        let request = inFlight.get(data.symbol);
        if (!request) {
            request = fetcher(data.symbol)
                .then(interval => {
                if (interval !== undefined && Number.isFinite(interval) && interval > 0) {
                    intervals.set(data.symbol, interval);
                    return interval;
                }
                return intervals.get(data.symbol);
            })
                .catch(() => intervals.get(data.symbol))
                .finally(() => inFlight.delete(data.symbol));
            inFlight.set(data.symbol, request);
        }
        void request.then(interval => {
            if (isActive())
                callback({ ...data, interval });
        });
    };
}
