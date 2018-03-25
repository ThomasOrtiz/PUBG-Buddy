const logger = require('winston');
const cs = require('../common.service');
const { Pool } = require('pg');

module.exports = {
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