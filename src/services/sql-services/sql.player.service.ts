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
    static async addPlayer(username: string, pubgId: string): Promise<any> {
        // TODO: Add Region
        const res: QueryResult = await pool.query('select pubg_id from players where pubg_id = $1', [pubgId]);
        if (res.rowCount === 0) {
            return await pool.query('insert into players (pubg_id, username) values ($1, $2)', [pubgId, username]);
        }
    }

    /**
     * Gets a player from their username
     * @param {string} username
     */
    static async getPlayer(username: string): Promise<Player> {
        // TODO: Add region
        const cacheKey = `sql.player.getPlayer-${username}`;
        const ttl: number = TimeInSeconds.FIVE_MINUTES;
        const storeFunction: Function = async (): Promise<Player> => {
            const res: QueryResult = await pool.query('select * from players where username = $1', [username])
            if (res.rowCount === 1) {
                return res.rows[0] as Player;
            }
        };

        return await cache.get<Player>(cacheKey, storeFunction, ttl);
    }
}

