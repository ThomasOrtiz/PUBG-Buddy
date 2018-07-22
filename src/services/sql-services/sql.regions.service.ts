import * as logger from 'winston';
import { CommonService as cs } from '../common.service';
import { Pool, QueryResult } from 'pg';
import { Region } from '../../models/models.module';


let connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export class SqlRegionsService {
    /**
     *  Return all PUBG modes
     * @returns {Region[]}: { id, fullname, shortname }
     */
    static async getAllRegions(): Promise<Region[]> {
        return pool.query('select * from regions').then((res: QueryResult) => {
            return res.rows as Region[];
        });
    }
}

