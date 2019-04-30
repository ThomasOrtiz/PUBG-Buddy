//import { CommonService } from '../services';
import { Pool, PoolConfig } from 'pg';
//import { Pool } from 'pg';
import * as logger from './logger.config';


const connection: PoolConfig = {
    host: 'postgres',
    port: 5432,
    user: 'pubg-buddy',
    database: 'pubg-buddy'
}



// const connectionString: string = CommonService.getEnvironmentVariable('DATABASE_URL');
//let connectionStr: string = CommonService.getEnvironmentVariable('DB_URL');
// const pool: Pool = new Pool({ connectionString: connectionString, ssl: true });

const pool: Pool = new Pool(connection);
//const pool: Pool = new Pool({ connectionString: connectionStr, ssl: true });
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export = pool
