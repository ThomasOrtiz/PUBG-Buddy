import { Mode } from './../../models/mode';
import * as logger from 'winston';
import { CommonService as cs } from '../common.service';
import { Pool, QueryResult } from 'pg';
import CacheService from '../cache.service';


let connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const ttl: number = 60 * 60 * 1      // caches for 1 hour
const cache = new CacheService(ttl); // create a new cache service instance

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
