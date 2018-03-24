const logger = require('winston');
const cs = require('./common.service');
const { Pool } = require('pg');

module.exports = {
    getLatestSeason,
    getAllSeasons,
};

let connectionString = cs.getEnvironmentVariable('DATABASE_URL');
const pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/** 
 *  Return all seasons for PUBG 
 */
async function getAllSeasons() {
    return pool.query('select season from seasons').then((res) => {
        let seasons = [];
        if(res.rowCount === 0) return seasons;
        for(let row of res.rows) {
            seasons.push(row.season);
        }
        return seasons;
    });
}

/** 
 * Returns the latest season of PUBG
 */
async function getLatestSeason() {
    return pool.query('select season from seasons where season = (select max(season) from seasons)')
        .then((res) => {
            return res.rows[0].season;
        });
}