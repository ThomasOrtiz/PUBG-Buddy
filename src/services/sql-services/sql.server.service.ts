import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { Server } from '../../interfaces';
import { CacheService, PubgSeasonService } from '../';
import { TimeInSeconds } from '../../shared/constants';
import { PubgAPI, PlatformRegion, Season } from 'pubg-typescript-api';
import { CommonService } from '../common.service';

const cache = new CacheService();


export class SqlServerService {

    /**
     * Attempts to get a server if it exists, otherwise insert the new server and return its defaults
     * @param {string} serverId
     */
    static async getOrRegisterServer(serverId: string): Promise<Server> {
        return pool.query('select server_id from servers where server_id = $1', [serverId])
            .then(async (res: QueryResult) => {
                if (res.rowCount === 0) {
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
     * @returns {Server} server id
     */
    static async getServer(serverId: string): Promise<Server> {
        return pool.query('select * from servers where server_id = $1', [serverId])
            .then((res: QueryResult) => {
                if (res.rowCount === 0) { return null; }

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
     * Adds a server to the servers table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerServer(serverId: string): Promise<QueryResult> {
        return pool.query('select server_id from servers where server_id = $1', [serverId]).then(async (res: QueryResult) => {
            if (res.rowCount === 0) {
                const api: PubgAPI = new PubgAPI(CommonService.getEnvironmentVariable('pubg_api_key'), PlatformRegion.STEAM);
                const currentSeason: Season = await PubgSeasonService.getCurrentSeason(api);
                const seasonName: string = PubgSeasonService.getSeasonDisplayName(currentSeason);

                return pool.query('insert into servers (server_id, defualt_bot_prefix, default_season, default_region, default_mode) values ($1, $2, $3, $4, $5)', [serverId, '!pubg-', seasonName, 'PC_NA', 'SQUAD_FPP']);
            }
        });
    }

    /**
     * Removes a server from the servers table
     * @param {string} serverId
     * @returns {boolean} server unregistered successfully
     */
    static async unRegisterServer(serverId: string): Promise<boolean> {
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
    static async getServerDefaults(serverId: string): Promise<Server> {
        const cacheKey: string = `sql.server.getServerDefaults-${serverId}`; // This must match the key in setServerDefaults
        const ttl: number = TimeInSeconds.ONE_HOUR;
        const storeFunction: Function = async (): Promise<Server> => {
            return pool.query('select * from servers where server_id = $1', [serverId]).then((res: QueryResult) => {
                if (res.rowCount === 0) {
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
        };

        return await cache.get<Server>(cacheKey, storeFunction, ttl);
    }

    /**
     * Sets the server's default settings
     * @param {string} serverId of server
     * @param {string} botPrefix for all bot commands
     * @param {string} season of PUBG
     * @param {string} region of PUBG
     * @param {string} mode fpp or tpp
     */
    static async setServerDefaults(serverId: string, botPrefix: string, season: string, region: string, mode: string): Promise<QueryResult> {
        const cacheKey: string = `sql.server.getServerDefaults-${serverId}`; // This must match the key in getServerDefaults
        cache.del(cacheKey);

        return pool.query('select server_id from servers where server_id = $1', [serverId])
            .then((res: QueryResult) => {
                if (res.rowCount === 0) {
                    return pool.query('insert into servers (server_id, default_bot_prefix, default_season, default_region, default_mode) values ($1, $2, $3, $4, $5)', [serverId, botPrefix, season, region, mode]);
                } else {
                    return pool.query('update servers set default_bot_prefix=$2, default_season=$3, default_region=$4, default_mode=$5 where server_id = $1', [serverId, botPrefix, season, region, mode]);
                }
            });
    }
}
