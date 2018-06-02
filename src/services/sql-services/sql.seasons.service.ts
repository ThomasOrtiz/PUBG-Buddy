import * as logger from 'winston';
import { CommonService as cs } from '../common.service';
import { Pool } from 'pg';


let connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export class SqlSeasonsService {

    /**
     *  Return all seasons for PUBG
     * @returns {obj}: { id, name, season }
     */
    static async getAllSeasons(): Promise<any> {
        return pool.query('select * from seasons').then((res) => {
            return res.rows;
        });
    }

    /**
     * Returns the latest season of PUBG
     * @returns {obj}: { id, name, season }
     */
    static async getLatestSeason(): Promise<any> {
        return pool.query('select season from seasons where season = (select max(season) from seasons)')
            .then((res) => {
                return res.rows[0];
            });
    }
}

