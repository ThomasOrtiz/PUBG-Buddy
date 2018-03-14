const logger = require('winston');
const { Pool } = require('pg');
require('dotenv').config();

module.exports = {
    setupTables,
    // Seasons
    getLatestSeason,
    getAllSeasons,
    // Servers
    registerServer,
    unRegisterServer,
    getServerDefaults,
    setServerDefaults,
    // Players
    getPlayer,
    getAllPlayers,
    addPlayer,
    // Server_registery
    registerUserToServer,
    unRegisterUserToServer,
    getRegisteredPlayersForServer
};

let connectionString;
if(process.env.DATABASE_URL) {
    connectionString = process.env.DATABASE_URL;
} else {
    logger.error('"DATABASE_URL" does not exist - check your .env file.');
    process.exit(-1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// -------------------- DB Helpers --------------------
/**
 * Adds the required database tables/data on bot run
 */
async function setupTables() {
    // await pool.query('delete from servers where 1=1');
    // await pool.query('delete from players where 1=1');
    // await pool.query('delete from server_registery where 1=1');
    // await pool.query('delete from seasons where 1=1');
    await pool.query('CREATE TABLE IF NOT EXISTS players (id SERIAL PRIMARY KEY, pubg_id TEXT, username TEXT)');
    await pool.query('CREATE TABLE IF NOT EXISTS seasons (id SERIAL PRIMARY KEY, season TEXT)', async () => {
        await addSeason('2018-01');
        await addSeason('2018-02');
        await addSeason('2018-03');
    });

    let defaultPrefix = '!';
    let defaultSeason = await getLatestSeason();
    let defaultRegion = 'na';
    let defaultMode = 'fpp';
    let defaultSquadSize = 4;
    await pool.query('CREATE TABLE IF NOT EXISTS servers ' +
                        '(id SERIAL PRIMARY KEY, server_id TEXT, default_bot_prefix TEXT DEFAULT \'' + defaultPrefix + '\', default_season TEXT DEFAULT \'' + defaultSeason + '\', ' + 
                        'default_region TEXT DEFAULT \'' + defaultRegion + '\', default_mode TEXT DEFAULT \'' + defaultMode + '\', default_squadSize TEXT DEFAULT \'' + defaultSquadSize + '\')');
    await pool.query('CREATE TABLE IF NOT EXISTS server_registery (id SERIAL PRIMARY KEY, fk_players_id integer REFERENCES players (id) ON DELETE CASCADE, fk_servers_id integer REFERENCES servers (id) ON DELETE CASCADE)');
}

// -------------------- seasons --------------------
/**
 * Adds the specified season
 * @param season: season in form of year-month --> 2018-01
 */
async function addSeason(season) {
    return pool.query('select * from seasons where season = $1', [season])
        .then(async (res) => {
            if(res.rowCount === 0){
                return pool.query('insert into seasons (season) values ($1)', [season]);
            }
        });
}

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

// -------------------- servers -------------------- 
/**
 * Adds a server to the servers table
 * @param {string} serverId 
 */
async function registerServer(serverId) {
    return pool.query('select server_id from servers where server_id = $1', [serverId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into servers (server_id) values ($1)', [serverId]);
            }
        });
}

/**
 * Removes a server from the servers table
 * @param {string} serverId
 */
async function unRegisterServer(serverId) {
    return pool.query('delete from servers where server_id=$1', [serverId])
        .then(async () => {
            return true;
        });
}

async function getServerDefaults(serverId) {
    return pool.query('select * from servers where server_id = $1', [serverId])
        .then((res) => {
            return res.rows[0];
        });
}

async function setServerDefaults(serverId, botPrefix, season, region, mode, squadSize) {
    return pool.query('select server_id from servers where server_id = $1', [serverId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into servers (server_id, default_bot_prefix, default_season, default_region, default_mode, default_squadsize) values ($1, $2, $3, $4, $5, $6)', [serverId, botPrefix, season, region, mode, squadSize]);
            } else {
                return pool.query('update servers set default_bot_prefix=$2, default_season=$3, default_region=$4, default_mode=$5, default_squadsize=$6 where server_id = $1', [serverId, botPrefix, season, region, mode, squadSize]);
            }
        });
}

// -------------------- players --------------------
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

// -------------------- server_registery -------------------- 
/**
 * Adds a user from a server's registery
 * @param {string} pubgId 
 * @param {string} serverId 
 */
async function registerUserToServer(pubgId, serverId) {
    return pool.query('select fk_servers_id from server_registery where fk_players_id=(select id from players where pubg_id=$1) and fk_servers_id=(select id from servers where server_id=$2)', [pubgId, serverId])
        .then((res) => {
            if(res.rowCount === 0) {
                return pool.query('insert into server_registery (fk_players_id, fk_servers_id) values ((select id from players where pubg_id=$1), (select id from servers where server_id=$2))', [pubgId, serverId])
                    .then(() => {
                        return true;
                    });
            } else if(res.rowCount === 1) {
                return true;
            } else {
                return false;
            }
        });
}

/**
 * Removes a user from a server's registery
 * @param {string} pubgId 
 * @param {string} serverId 
 */
async function unRegisterUserToServer(pubgId, serverId) {
    return pool.query('delete from server_registery where fk_players_id=(select id from players where pubg_id=$1) and fk_servers_id=(select id from servers where server_id=$2)', [pubgId, serverId])
        .then((res) => {
            if(res.rowCount === 1){
                return true;
            } else {
                return false;
            }
        });
}

/**
 * Returns all users that are registered to a server's registery
 * @param {string} serverId 
 */
async function getRegisteredPlayersForServer(serverId) {
    return pool.query('select P.pubg_id, P.username from server_registery as R left join players as P on R.fk_players_id = P.id where fk_servers_id = (select id from servers where server_id=$1)', [serverId])
        .then((res) => {
            if(res.rowCount != 0){
                return res.rows;
            } else {
                return [];
            } 
        });
}