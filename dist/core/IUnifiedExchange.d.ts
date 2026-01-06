import { IExchangeClient } from './IExchangeClient.js';
import { IStreamManager } from './IStreamManager.js';
import { IUserDataManager } from './IUserDataManager.js';
export interface IUnifiedExchange {
    spot: IExchangeClient;
    futures: IExchangeClient;
    streams: IStreamManager;
    userData?: IUserDataManager;
}
//# sourceMappingURL=IUnifiedExchange.d.ts.map