import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import CacheService from '../cache.service';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService(); // create a new cache service instance

export class SqlUserRegisteryService {

    private static tableName: string = 'user_registery';

    static async getRegisteredUser(discordId: string): Promise<string> {
        const cacheKey: string = `sql.userRegistery.getPlayerSeasonStatsById-${discordId}`;
        const ttl: number = TimeInSeconds.FIVE_MINUTES;
        const storeFunction: Function = async (): Promise<string> => {
            return pool.query(`select P.username from ${this.tableName} as UR left join players as P on P.id = UR.fk_players_id where discord_id = $1`, [discordId]).then((res: QueryResult) => {
                if(res.rowCount !== 0){
                    return res.rows[0].username;
                } else {
                    return '';
                }
            });
        };

        return await cache.get<string>(cacheKey, storeFunction, ttl);
    }

    /**
     * Gets a user
     * @param {string} serverId
     */
    static async getUserProfile(discordId: string): Promise<string> {
        const cacheKey: string = `sql.userRegistery.getUser-${discordId}`; // This must match the key in registerUser
        const ttl: number = TimeInSeconds.ONE_HOUR;
        const storeFunction: Function = async (): Promise<string> => {
            const query: string = `select UR.*, P.username from ${this.tableName} as UR left join players as P on UR.fk_players_id = P.id where discord_id = $1`;
            return pool.query(query, [discordId]).then((res: QueryResult) => {
                if(res.rowCount === 0) {
                    return null;
                }

                return res.rows[0].username;
            });
        };

        return await cache.get<string>(cacheKey, storeFunction, ttl);
    }

    /**
     * Adds a user  to the user_registery table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerUser(discordId: string, pubgId: string): Promise<boolean> {
        const cacheKey: string = `sql.userRegistery.getUser-${discordId}`; // This must match the key in getUserProfile
        cache.del(cacheKey);

        return pool.query(`select * from ${this.tableName} where discord_id = $1`, [discordId]).then(async (res: QueryResult) => {
            if(res.rowCount === 0) {
                pool.query(`
                    insert into ${this.tableName}
                    (discord_id, fk_players_id)
                    values ($1, (select id from players where pubg_id=$2))`, [discordId, pubgId]
                );
                return true;
            } else {
                pool.query(`
                    update ${this.tableName}
                    set
                        fk_players_id=(select id from players where pubg_id=$2)
                    where discord_id = $1`, [discordId, pubgId]
                );
                return true;
            }
        });
    }

    /**
     * Removes a user from the registery
     * @param {string} discordId
     */
    static async unRegisterUser(discordId: string): Promise<QueryResult> {
        return pool.query(`delete from ${this.tableName} where discord_id = $1`, [discordId]);
    }

}
