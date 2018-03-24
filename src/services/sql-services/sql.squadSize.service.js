const logger = require('winston');
const cs = require('../common.service');
const { Pool } = require('pg');

module.exports = {
    getAllSquadSizes,
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
 *  Return all PUBG modes
 * @returns {obj}: { id, name, size }
 */
async function getAllSquadSizes() {
    return pool.query('select * from squad_sizes').then((res) => {
        return res.rows;
    });
}