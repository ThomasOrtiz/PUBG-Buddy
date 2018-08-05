import * as pool from './sql.config.service';
import { QueryResult } from 'pg';
import { Region } from '../../models/models.module';


export class SqlRegionsService {
    /**
     *  Return all PUBG modes
     * @returns {Region[]}: { id, fullname, shortname }
     */
    static async getAllRegions(): Promise<Region[]> {
        return pool.query('select * from regions').then((res: QueryResult) => {
            return res.rows as Region[];
        });
    }
}

