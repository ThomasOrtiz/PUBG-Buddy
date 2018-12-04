import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { IPlayer } from '../../interfaces';
import { CacheService } from '../';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService();

export class SqlPlayersService {

    private static getCacheKey(username: string, platform: string): string {
        return `sql.player.getPlayer-${username}-${platform}`;
    }

    /**
     * Adds a player to the player table
     * @param {string} username
     * @param {string} pubgId
     */
    static async addPlayer(username: string, pubgId: string, platform: string): Promise<QueryResult> {
        const cacheKey: string = this.getCacheKey(username, platform);
        cache.del(cacheKey);

        const res: QueryResult = await pool.query('select * from players where pubg_id = $1 and platform = $2', [pubgId, platform]);
        if (res.rowCount === 0) {
            return await pool.query('insert into players (pubg_id, username, platform) values ($1, $2, $3)', [pubgId, username, platform]);
        } else {
            const player: IPlayer = res.rows[0] as IPlayer;
            if (player.username !== username) {
                return await pool.query('update players set username = $2 where pubg_id = $1 and platform = $3', [pubgId, username, platform]);
            }
        }
    }

    /**
     * Gets a player from their username
     * @param {string} username
     */
    static async getPlayer(username: string, platform: string): Promise<IPlayer> {
        const cacheKey: string = this.getCacheKey(username, platform);
        const ttl: number = TimeInSeconds.FIVE_MINUTES;
        const storeFunction: Function = async (): Promise<IPlayer> => {
            const res: QueryResult = await pool.query('select * from players where username = $1 and platform = $2', [username, platform]);
            if (res.rowCount === 1) {
                return res.rows[0] as IPlayer;
            }
        };

        return await cache.get<IPlayer>(cacheKey, storeFunction, ttl);
    }
}

