import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { CacheService } from '../';
import { TimeInSeconds } from '../../shared/constants';
import { IPlayer } from '../../interfaces';

const cache = new CacheService();

export class SqlUserRegisteryService {

    private static tableName: string = 'user_registery';

    private static getCacheKey(discordId: string) {
        return `sql.userRegistery.getRegisteredUser-${discordId}`;
    }

    static async getRegisteredUser(discordId: string): Promise<IPlayer> {
        const cacheKey: string = this.getCacheKey(discordId);
        const ttl: number = TimeInSeconds.THIRTY_MINUTES;
        const storeFunction: Function = async (): Promise<IPlayer> => {
            const query: string = `select P.username, P.platform from ${this.tableName} as UR left join players as P on P.id = UR.fk_players_id where discord_id = $1`;
            const res: QueryResult = await pool.query(query, [discordId]);

            if (res.rowCount !== 0){
                return res.rows[0] as IPlayer;
            }
            return null;
        };

        return await cache.get<IPlayer>(cacheKey, storeFunction, ttl);
    }

    /**
     * Adds a user  to the user_registery table if it doesn't exist already
     * @param {string} serverId
     */
    static async registerUser(discordId: string, pubgId: string): Promise<boolean> {
        const cacheKey: string = this.getCacheKey(discordId);
        cache.del(cacheKey);

        const query: string = `select * from ${this.tableName} where discord_id = $1`;
        const res: QueryResult = await pool.query(query, [discordId]);

        if (res.rowCount === 0) {
            pool.query(`insert into ${this.tableName}
                (discord_id, fk_players_id)
                values ($1, (select id from players where pubg_id=$2))`, [discordId, pubgId]
            );
            return true;
        } else {
            pool.query(`update ${this.tableName}
                set
                    fk_players_id=(select id from players where pubg_id=$2)
                where discord_id = $1`, [discordId, pubgId]
            );
            return true;
        }
    }

    /**
     * Removes a user from the registery
     * @param {string} discordId
     */
    static async unRegisterUser(discordId: string): Promise<QueryResult> {
        const cacheKey: string = this.getCacheKey(discordId);
        cache.del(cacheKey);

        return pool.query(`delete from ${this.tableName} where discord_id = $1`, [discordId]);
    }

}
