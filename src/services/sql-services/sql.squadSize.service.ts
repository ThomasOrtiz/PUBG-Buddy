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


export class SqlSqaudSizeService {
    /**
     *  Return all PUBG modes
     * @returns {obj}: { id, name, size }
     */
    static async getAllSquadSizes(): Promise<any> {
        return pool.query('select * from squad_sizes').then((res) => {
            return res.rows;
        });
    }
}
