const config = require('../config.json');
const logger = require('winston');
const { Pool } = require('pg');

module.exports = {
    setupTables,
    registerServer,
    registerUserToServer,
    unRegisterUserToServer,
    getPlayer,
    getAllPlayers,
    addPlayer,
    getRegisteredPlayersForServer,
    getLatestSeason,
    getAllSeasons
};

let connectionString;
if(process.env.DATABASE_URL) {
    connectionString = process.env.bot_token;
} else if(config.DATABASE_URL) {
    connectionString = config.DATABASE_URL;
} else {
    logger.error('Connection string does not exist - check your config.json file.');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function setupTables() {
    // await pool.query('delete from servers where 1=1');
    // await pool.query('delete from players where 1=1');
    // await pool.query('delete from registery where 1=1');
    // await pool.query('delete from seasons where 1=1');
    await pool.query('CREATE TABLE IF NOT EXISTS servers (serverId TEXT)');
    await pool.query('CREATE TABLE IF NOT EXISTS players (username TEXT, pubgId TEXT)');
    await pool.query('CREATE TABLE IF NOT EXISTS registery (pubgId TEXT, serverId TEXT)');
    await pool.query('CREATE TABLE IF NOT EXISTS seasons (season TEXT)', () => {
        addSeason('2018-01');
        addSeason('2018-02');
        addSeason('2018-03');
    });
}

/** -------------------- seasons -------------------- */
async function addSeason(season) {
    pool.query('select * from seasons where season = $1', [season])
        .then(async (res) => {
            if(res.rowCount === 0){
                await pool.query('insert into seasons (season) values ($1)', [season]);
            }
        });
}

async function getAllSeasons() {
    return pool.query('select * from seasons').then((res) => {
        let seasons = [];
        if(res.rowCount === 0) return seasons;
        for(let row of res.rows) {
            seasons.push(row.season);
        }
        return seasons;
    });
}

async function getLatestSeason() {
    return pool.query('select season from seasons where season = (select max(season) from seasons)')
        .then((res) => {
            return res.rows[0].season;
        });
}

/** -------------------- servers -------------------- */
async function registerServer(serverId) {
    return pool.query('select * from servers where serverId = $1', [serverId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into servers (serverId) values ($1)', [serverId]);
            }
        });
}

/** -------------------- players -------------------- */
async function addPlayer(username, pubgId) {
    return pool.query('select * from players where pubgId = $1', [pubgId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into players (username, pubgId) values ($1, $2)', [username, pubgId]);
            }
        });
}

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

async function getPlayer(username) {
    return pool.query('select * from players where username = $1', [username])
        .then((res) => {
            if(res.rowCount === 1) {
                return res.rows[0];
            }
        });
}

/** -------------------- registery -------------------- */
async function unRegisterUserToServer(pubgId, serverId) {
    return pool.query('delete from registery where serverId = $1 and pubgId = $2', [serverId, pubgId])
        .then((res) => {
            if(res.rowCount === 1){
                return true;
            } else {
                return false;
            }
        });
}

async function registerUserToServer(pubgId, serverId) {
    return pool.query('select * from registery where serverId = $1 and pubgId = $2', [serverId, pubgId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into registery (pubgId, serverId) values ($1, $2)', [pubgId, serverId]);
            } else {
                return false;
            }
        });
}

async function getRegisteredPlayersForServer(serverId) {
    return pool.query('select * from registery as R left join players as P on R.pubgId = P.pubgId where serverId = $1', [serverId])
        .then((res) => {
            if(res.rowCount != 0){
                return res.rows;
            } else {
                return [];
            } 
        });
}