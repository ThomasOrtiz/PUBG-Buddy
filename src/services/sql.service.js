const logger = require('winston');
const cs = require('./common.service');
const { Pool } = require('pg');
const Server = require('../models/server');

module.exports = {
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

let connectionString = cs.getEnvironmentVariable('DATABASE_URL');
const pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// -------------------- seasons --------------------
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
 * Adds a server to the servers table if it doesn't exist already
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

/**
 * Get the sever's default settings
 * @param {string} serverId 
 * @returns {Server} server: server
 */
async function getServerDefaults(serverId) {
    return pool.query('select * from servers where server_id = $1', [serverId])
        .then((res) => {
            if(res.rowCount === 0) {
                return null;
            }
            let server = new Server(res.rows[0].id);
            server.default_bot_prefix = res.rows[0].default_bot_prefix;
            server.default_season = res.rows[0].default_season;
            server.default_region = res.rows[0].default_region;
            server.default_mode = res.rows[0].default_mode;
            server.default_squadSize = res.rows[0].default_squadsize;
            return server;
        });
}

/**
 * Sets the server's default settings
 * @param {string} serverId of server
 * @param {string} botPrefix for all bot commands
 * @param {string} season of PUBG
 * @param {string} region of PUBG
 * @param {string} mode fpp or tpp
 * @param {string} squadSize 1, 2, 4
 */
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