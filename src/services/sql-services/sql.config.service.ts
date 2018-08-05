import { CommonService as cs } from '../common.service';
import { Pool } from 'pg';
import * as logger from '../logger.service';


const connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({ connectionString: connectionString, ssl: true });
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export = pool
