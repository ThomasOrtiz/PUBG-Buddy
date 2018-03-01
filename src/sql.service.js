const sql = require('sqlite');

module.exports = {
    getConnection: getConnection,
    setupTables: setupTables
};

let connection;

function getConnection() {
    if(connection) {
        return connection; 
    } else { 
        return sql.open('./pubg_data.sqlite');
    }
}

function setupTables() {
    sql.run('CREATE TABLE IF NOT EXISTS servers (name TEXT, serverId TEXT)');
    sql.run('CREATE TABLE IF NOT EXISTS players (username TEXT, userId TEXT, server INTEGER)');
}