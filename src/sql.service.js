const sql = require('sqlite');

module.exports = {
    getConnection: getConnection,
    setupTables: setupTables,
    registerServer: registerServer,
    registerUserToServer: registerUserToServer,
    unRegisterUserToServer: unRegisterUserToServer,
    getPlayer: getPlayer,
    addPlayer: addPlayer,
    getRegisteredPlayersForServer
};

async function getConnection() {
    return await sql.open('./pubg_data.sqlite');
}

function setupTables() {
    sql.run('CREATE TABLE IF NOT EXISTS servers (serverId TEXT)');
    sql.run('CREATE TABLE IF NOT EXISTS players (username TEXT, pubgId TEXT)');
    sql.run('CREATE TABLE IF NOT EXISTS registery (pubgId TEXT, serverId TEXT)');
}

/** -------------------- servers -------------------- */
async function registerServer(serverId) {
    const db = await getConnection();
    db.get('select * from servers where serverId = ?', serverId)
        .then(function(server) {
            if(!server) {
                sql.run('insert into servers (serverId) values ("' + serverId + '") ');
            }
        });
}

/** -------------------- players -------------------- */
async function addPlayer(username, pubgId) {
    const db = await getConnection();
    db.get('select * from players where username = ?', username)
        .then((player) => {
            if(!player) {
                sql.run('insert into players (username, pubgId) values (?, ?)', [username, pubgId]);
            }
        });
}

async function getPlayer(username) {
    const db = await getConnection();
    return db.get('select * from players where username = ?', username);
}

/** -------------------- registery -------------------- */
async function unRegisterUserToServer(pubgId, serverId) {
    const db = await getConnection();
    return db.run('delete from registery where serverId = ? and pubgId = ?', [serverId, pubgId]);
}

async function registerUserToServer(pubgId, serverId) {
    const db = await getConnection();
    db.get('select * from registery where serverId = ? and pubgId = ?', [serverId, pubgId])
        .then(function(player) {
            if(!player) {
                sql.run('insert into registery (pubgId, serverId) values (?, ?)', [pubgId, serverId]);
            }
        });
}

async function getRegisteredPlayersForServer(serverId) {
    const db = await getConnection();
    return db.all('select * from registery as R left join players as P on R.pubgId = P.pubgId where serverId = ?', serverId);
}