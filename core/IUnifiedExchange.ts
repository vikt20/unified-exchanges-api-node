import { IExchangeClient, IFuturesExchangeClient } from './IExchangeClient.js';
import { IStreamManager } from './IStreamManager.js';
import { IUserDataManager } from './IUserDataManager.js';

export interface IUnifiedExchange {
    spot: IExchangeClient;
    futures: IFuturesExchangeClient;
    streams: IStreamManager;
    userData?: IUserDataManager;
}
