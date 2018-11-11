import { CacheService } from '../';
import { PubgAPI, Match } from 'pubg-typescript-api';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService();


export class PubgMatchesService {

    static async getMatchInfo(api: PubgAPI, matchId: string): Promise<Match> {
        const cacheKey: string = `pubgApi.getMatchInfo-${matchId}`;
        const ttl: number = TimeInSeconds.ONE_HOUR;
        const storeFunction: Function = async (): Promise<Match> => {
            return await Match.get(api, matchId);
        };

        return await cache.get<Match>(cacheKey, storeFunction, ttl);
    }

}
