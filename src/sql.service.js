const sql = require('sqlite');

module.exports = {
    getConnection,
    setupTables,
    registerServer,
    registerUserToServer,
    unRegisterUserToServer,
    getPlayer,
    addPlayer,
    getRegisteredPlayersForServer,
    getLatestSeason
};

async function getConnection() {
    return await sql.open('./pubg_data.sqlite');
}

async function setupTables() {
    const db = await getConnection();
    db.run('CREATE TABLE IF NOT EXISTS servers (serverId TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS players (username TEXT, pubgId TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS registery (pubgId TEXT, serverId TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS seasons (season TEXT)').then(() => {
        addSeason('2018-01');
        addSeason('2018-02');
        addSeason('2018-03');
    });
    
}

/** -------------------- seasons -------------------- */
async function addSeason(season) {
    const db = await getConnection();
    db.get('select * from seasons where season = ?', season)
        .then(function(player) {
            if(!player) {
                db.run('insert into seasons (season) values (?)', season);
            }
        });
}

async function getLatestSeason() {
    const db = await getConnection();
    return db.get('select season from seasons where season = (select max(season) from seasons)')
        .then((season) => {
            return season.season;
        });
}

/** -------------------- servers -------------------- */
async function registerServer(serverId) {
    const db = await getConnection();
    db.get('select * from servers where serverId = ?', serverId)
        .then(function(server) {
            if(!server) {
                db.run('insert into servers (serverId) values ("' + serverId + '") ');
            }
        });
}

/** -------------------- players -------------------- */
async function addPlayer(username, pubgId) {
    const db = await getConnection();
    db.get('select * from players where pubgId = ?', pubgId)
        .then((player) => {
            if(!player) {
                db.run('insert into players (username, pubgId) values (?, ?)', [username, pubgId]);
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
                db.run('insert into registery (pubgId, serverId) values (?, ?)', [pubgId, serverId]);
            }
        });
}

async function getRegisteredPlayersForServer(serverId) {
    const db = await getConnection();
    return db.all('select * from registery as R left join players as P on R.pubgId = P.pubgId where serverId = ?', serverId);
}