import * as pool from '../../config/sql.config';
import { QueryResult } from 'pg';
import { SquadSize } from '../../interfaces';


export class SqlSqaudSizeService {

    /**
     *  Return all PUBG modes
     * @returns {Promise<SquadSize[]>}: { id, name, size }
     */
    static async getAllSquadSizes(): Promise<SquadSize[]> {
        return pool.query('select * from squad_sizes').then((res: QueryResult) => {
            return res.rows as SquadSize[];
        });
    }
}
