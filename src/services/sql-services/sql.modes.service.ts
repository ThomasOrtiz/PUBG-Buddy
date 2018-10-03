import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { Mode } from '../../interfaces';
import CacheService from '../cache.service';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService(); // create a new cache service instance

export class SqlModesService {

    /**
     *  Return all PUBG modes
     * @returns {Mode[]}: { id, fullname, shortname }
     */
    static async getAllModes(): Promise<Mode[]> {
        const cacheKey = `sql.modes.getAllModes`;
        const ttl: number = TimeInSeconds.ONE_HOUR;
        const storeFunction: Function = async (): Promise<Mode[]> => {
            return pool.query('select * from modes').then((res: QueryResult) => {
                return res.rows as Mode[];
            });
        };

        return await cache.get<Mode[]>(cacheKey, storeFunction, ttl);
    }
}
