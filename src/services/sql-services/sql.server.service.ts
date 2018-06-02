import * as logger from 'winston';
import { CommonService as cs } from '../common.service';
import { Pool } from 'pg';
import { Server } from '../../models/server';


let connectionString: string = cs.getEnvironmentVariable('DATABASE_URL');
const pool: Pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});


export class SqlServerService {
    /**
     * Attempts to get a server if it exists, otherwise insert the new server and return its defaults
     * @param {string} serverId
     */
    static async getOrRegisterServer(serverId: string): Promise<any> {
        return pool.query('select server_id from servers where server_id = $1', [serverId])
            .then(async (res) => {
                if(res.rowCount === 0) {
                    await pool.query('insert into servers (server_id) values ($1)', [serverId]);
                    return this.getServerDefaults(serverId);
                } else {
                    return this.getServerDefaults(serverId);
                }
            });
    }

    /**
     * Get a server
     * @param {string} serverId
     */
    static async getServer(serverId: string): Promise<any> {
        return pool.query('select * from servers where server_id = $1', [serverId])
            .then((res) => {
                if(res.rowCount > 0) return res.rows;
                else return null;
            });
    }

    /**
     * Adds a server to the servers table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerServer(serverId: string): Promise<any> {
        return pool.query('select server_id from servers where server_id = $1', [serverId])
            .then((res) => {
                if(res.rowCount === 0) {
                    return pool.query('insert into servers (server_id) values ($1)', [serverId]);
                }
            });
    }

    /**
     * Removes a server from the servers table
     * @param {string} serverId
     */
    static async unRegisterServer(serverId: string): Promise<any> {
        return pool.query('delete from servers where server_id=$1', [serverId])
            .then(async () => {
                return true;
            });
    }

    /**
     * Get the sever's default settings
     * @param {string} serverId
     * @returns {Server} server: server
     */
    static async getServerDefaults(serverId: string): Promise<any> {
        return pool.query('select * from servers where server_id = $1', [serverId])
            .then((res) => {
                if(res.rowCount === 0) {
                    return null;
                }
                let server: Server = {
                    id: '',
                    serverId: res.rows[0].id,
                    default_bot_prefix: res.rows[0].default_bot_prefix,
                    default_season: res.rows[0].default_season,
                    default_region: res.rows[0].default_region,
                    default_mode: res.rows[0].default_mode,
                    default_squadSize: res.rows[0].default_squadsize
                }

                return server;
            });
    }

    /**
     * Sets the server's default settings
     * @param {string} serverId of server
     * @param {string} botPrefix for all bot commands
     * @param {string} season of PUBG
     * @param {string} region of PUBG
     * @param {string} mode fpp or tpp
     * @param {string} squadSize 1, 2, 4
     */
    static async setServerDefaults(serverId: string, botPrefix: string, season: string, region: string, mode: string, squadSize: number): Promise<any> {
        return pool.query('select server_id from servers where server_id = $1', [serverId])
            .then((res) => {
                if(res.rowCount === 0) {
                    return pool.query('insert into servers (server_id, default_bot_prefix, default_season, default_region, default_mode, default_squadsize) values ($1, $2, $3, $4, $5, $6)', [serverId, botPrefix, season, region, mode, squadSize]);
                } else {
                    return pool.query('update servers set default_bot_prefix=$2, default_season=$3, default_region=$4, default_mode=$5, default_squadsize=$6 where server_id = $1', [serverId, botPrefix, season, region, mode, squadSize]);
                }
            });
    }
}
