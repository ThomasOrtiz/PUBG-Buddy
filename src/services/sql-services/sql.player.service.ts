import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { Player } from '../../interfaces';
import { CacheService } from '../';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService();

export class SqlPlayersService {

    /**
     * Adds a player to the player table
     * @param {string} username
     * @param {string} pubgId
     */
    static async addPlayer(username: string, pubgId: string, platform: string): Promise<any> {
        const res: QueryResult = await pool.query('select pubg_id from players where pubg_id = $1 and platform = $2', [pubgId, platform]);
        if (res.rowCount === 0) {
            return await pool.query('insert into players (pubg_id, username, platform) values ($1, $2, $3)', [pubgId, username, platform]);
        }
    }

    /**
     * Gets a player from their username
     * @param {string} username
     */
    static async getPlayer(username: string, platform: string): Promise<Player> {
        const cacheKey: string = `sql.player.getPlayer-${username}-${platform}`;
        const ttl: number = TimeInSeconds.FIVE_MINUTES;
        const storeFunction: Function = async (): Promise<Player> => {
            const res: QueryResult = await pool.query('select * from players where username = $1 and platform = $2', [username, platform]);
            if (res.rowCount === 1) {
                return res.rows[0] as Player;
            }
        };

        return await cache.get<Player>(cacheKey, storeFunction, ttl);
    }
}

