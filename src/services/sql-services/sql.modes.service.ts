import * as pool from './sql.config.service';
import { QueryResult } from 'pg';
import { Mode } from '../../models/models.module';
import CacheService from '../cache.service';

const cache = new CacheService(); // create a new cache service instance

export class SqlModesService {

    /**
     *  Return all PUBG modes
     * @returns {Mode[]}: { id, fullname, shortname }
     */
    static async getAllModes(): Promise<Mode[]> {
        const cacheKey = `sql.modes.getAllModes`;
        const ttl: number = 60 * 60 * 10;  // caches for 5 minutes
        const storeFunction: Function = async (): Promise<Mode[]> => {
            return pool.query('select * from modes').then((res: QueryResult) => {
                return res.rows as Mode[];
            });
        };

        return await cache.get<Mode[]>(cacheKey, storeFunction, ttl);
    }
}
