import * as pool from './sql.config.service';
import { QueryResult } from 'pg';

import CacheService from '../cache.service';

const cache = new CacheService(); // create a new cache service instance

export class SqlUserRegisteryService {

    private static tableName: string = 'user_registery';

    static async getRegisteredUser(discordId: string): Promise<string> {
        const cacheKey: string = `sql.userRegistery.getPlayerSeasonStatsById-${discordId}`;
        const ttl: number = 60 * 5;  // caches for 5 minutes
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
     * Adds a server to the servers table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerUser(discordId: string, pubgId: string): Promise<boolean> {
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
     * Adds a server to the servers table if it doesn't exist already
     * @param {string} serverId
     */
    static async unRegisterUser(discordId: string): Promise<QueryResult> {
        return pool.query(`delete from ${this.tableName} where discord_id = $1`, [discordId]);
    }

}
