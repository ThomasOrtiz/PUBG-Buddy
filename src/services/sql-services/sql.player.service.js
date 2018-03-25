const logger = require('winston');
const cs = require('../common.service');
const { Pool } = require('pg');

module.exports = {
    getPlayer,
    getAllPlayers,
    addPlayer,
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
 * Adds a player to the player table
 * @param {string} username 
 * @param {string} pubgId 
 */
async function addPlayer(username, pubgId) {
    return pool.query('select pubg_id from players where pubg_id = $1', [pubgId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into players (pubg_id, username) values ($1, $2)', [pubgId, username]);
            }
        });
}

/**
 * Gets all players 
 */
async function getAllPlayers() {
    return pool.query('select * from players').then((res) => {
        let players = [];
        if(res.rowCount === 0) return players;
        for(let row of res.rows) {
            players.push(row.username);
        }
        return players;
    });
}

/**
 * Gets a player from their username
 * @param {string} username 
 */
async function getPlayer(username) {
    return pool.query('select * from players where username = $1', [username])
        .then((res) => {
            if(res.rowCount === 1) {
                return res.rows[0];
            }
        });
}