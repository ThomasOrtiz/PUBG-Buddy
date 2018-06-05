import * as logger from 'winston';
import { CommonService as cs } from '../common.service';
import { Pool, QueryResult } from 'pg';


let connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export class SqlModesService {
    /**
     *  Return all PUBG modes
     * @returns {obj}: { id, fullname, shortname }
     */
    static async getAllModes(): Promise<any> {
        return pool.query('select * from modes').then((res: QueryResult) => {
            return res.rows;
        });
    }
}
