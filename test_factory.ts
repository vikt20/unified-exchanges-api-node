import { ExchangeConnection } from './core/index.js';

async function test() {
    console.log('Testing ExchangeConnection...');

    try {
        // Instantiate without real credentials for structure test
        const api = new ExchangeConnection('binance', 'test_key', 'test_secret') as any;

        if (api.spot && api.futures && api.streams && api.userData) {
            console.log('SUCCESS: All properties present on ExchangeConnection instance.');
            console.log('Spot:', api.spot.constructor.name);
            console.log('Futures:', api.futures.constructor.name);
            console.log('Streams:', api.streams.constructor.name);
            console.log('UserData:', api.userData.constructor.name);
        } else {
            console.error('FAILURE: Missing properties on ExchangeConnection instance.');
            console.log(api);
        }


    } catch (error) {
        console.error('ERROR (Auth Test):', error);
    }

    console.log('\nTesting ExchangeConnection (No Auth)...');
    try {
        const publicApi = new ExchangeConnection('binance') as any;

        if (publicApi.spot && publicApi.futures && publicApi.streams) {
            console.log('SUCCESS: Public properties present.');
            if (!publicApi.userData) {
                console.log('SUCCESS: UserData is correctly undefined.');
            } else {
                console.error('FAILURE: UserData should be undefined for public connection.');
            }
        } else {
            console.error('FAILURE: Missing public properties.');
        }

    } catch (error) {
        console.error('ERROR (No Auth Test):', error);
    }
}

test();
