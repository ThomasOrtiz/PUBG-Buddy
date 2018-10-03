import * as pool from '../../config/sql.config';
import { Season } from '../../interfaces';
import { QueryResult } from 'pg';


export class SqlSeasonsService {

    /**
     *  Return all seasons for PUBG
     * @returns {obj}: { id, name, season }
     */
    static async getAllSeasons(): Promise<Season[]> {
        // TODO: Run a 'timed' event to grab most recent season

        return pool.query('select * from seasons').then((res: QueryResult) => {
            return res.rows as Season[];
        });
    }

    /**
     * Returns the latest season of PUBG
     * @returns {obj}: { id, name, season }
     */
    static async getLatestSeason(): Promise<Season> {
        return pool.query('select season from seasons where season = (select max(season) from seasons)')
            .then((res: QueryResult) => {
                return res.rows[0] as Season;
            });
    }
}

