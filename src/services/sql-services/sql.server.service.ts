import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { IServer } from '../../interfaces';
import { CacheService } from '../';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService();


export class SqlServerService {

    /**
     * Adds a server to the servers table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerServer(serverId: string): Promise<QueryResult> {
        const res: QueryResult = await pool.query('select server_id from servers where server_id = $1', [serverId]);
        if (res.rowCount === 0) {
            return pool.query(`insert into servers
                (server_id, default_bot_prefix, default_region, default_mode)
                values ($1, $2, $3, $4)`,
                [serverId, '!pubg-', 'PC_NA', 'SQUAD_FPP']);
        }
    }

    /**
     * Removes a server from the servers table
     * @param {string} serverId
     * @returns {boolean} server unregistered successfully
     */
    static async unRegisterServer(serverId: string): Promise<boolean> {
        await pool.query('delete from servers where server_id=$1', [serverId]);
        return true;
    }

    /**
     * Get the sever's default settings
     * @param {string} serverId
     * @returns {Server} server
     */
    static async getServer(serverId: string): Promise<IServer> {
        const cacheKey: string = `sql.server.getServer-${serverId}`; // This must match the key in setServerDefaults
        const ttl: number = TimeInSeconds.THIRTY_MINUTES;
        const storeFunction: Function = async (): Promise<IServer> => {
            const res: QueryResult = await pool.query('select * from servers where server_id = $1', [serverId]);

            // This handles the very small window in time where the server hasn't been added to the database but messages are coming through
            if (res.rowCount === 0) {
                await this.registerServer(serverId);
                return {
                    id: '',
                    serverId: serverId,
                    default_bot_prefix: '!pubg-',
                    default_region: 'PC_NA',
                    default_mode: 'SQUAD_FPP',
                    isStoredInDb: false
                }
            } else {
                return {
                    id: '',
                    serverId: res.rows[0].id,
                    default_bot_prefix: res.rows[0].default_bot_prefix,
                    default_region: res.rows[0].default_region,
                    default_mode: res.rows[0].default_mode,
                    isStoredInDb: true
                }
            }
        };

        return await cache.get<IServer>(cacheKey, storeFunction, ttl);
    }


    /**
     * Sets the server's default settings
     * @param {string} serverId of server
     * @param {string} botPrefix for all bot commands
     * @param {string} season of PUBG
     * @param {string} region of PUBG
     * @param {string} mode fpp or tpp
     */
    static async setServerDefaults(serverId: string, botPrefix: string, region: string, mode: string): Promise<QueryResult> {
        const cacheKey: string = `sql.server.getServer-${serverId}`; // This must match the key in getServer
        cache.del(cacheKey);

        const res: QueryResult = await pool.query('select server_id from servers where server_id = $1', [serverId]);
        if (res.rowCount === 0) {
            return pool.query('insert into servers (server_id, default_bot_prefix, default_region, default_mode) values ($1, $2, $3, $4)', [serverId, botPrefix, region, mode]);
        }
        return pool.query('update servers set default_bot_prefix=$2, default_region=$3, default_mode=$4 where server_id = $1', [serverId, botPrefix, region, mode]);
    }

    static deleteServerCache(serverId: string) {
        const cacheKey: string = `sql.server.getServer-${serverId}`; // This must match the key in getServer
        cache.del(cacheKey);
    }
}
