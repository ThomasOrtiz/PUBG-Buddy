const PlayerSql = require('./sql-services/sql.player.service');
const ServerSql = require('./sql-services/sql.server.service');
const SeasonsSql = require('./sql-services/sql.seasons.service');
const ServerRegisterySql = require('./sql-services/sql.serverRegistery.service');
const ModesSql = require('./sql-services/sql.modes.service');
const RegionsSql = require('./sql-services/sql.regions.service');
const SquadSizeSql = require('./sql-services/sql.squadSize.service');

module.exports = {
    // Seasons
    getLatestSeason: SeasonsSql.getLatestSeason,
    getAllSeasons: SeasonsSql.getAllSeasons,
    // Servers
    getOrRegisterServer: ServerSql.getOrRegisterServer,
    registerServer: ServerSql.registerServer,
    unRegisterServer: ServerSql.unRegisterServer,
    getServerDefaults: ServerSql.getServerDefaults,
    setServerDefaults: ServerSql.setServerDefaults,
    // Players
    getPlayer: PlayerSql.getPlayer,
    getAllPlayers: PlayerSql.getAllPlayers,
    addPlayer: PlayerSql.addPlayer,
    // Server_registery
    registerUserToServer: ServerRegisterySql.registerUserToServer,
    unRegisterUserToServer: ServerRegisterySql.unRegisterUserToServer,
    getRegisteredPlayersForServer: ServerRegisterySql.getRegisteredPlayersForServer,
    // Modes
    getAllModes: ModesSql.getAllModes,
    // Squad Sizes
    getAllSquadSizes: SquadSizeSql.getAllSquadSizes,
    // Regions
    getAllRegions: RegionsSql.getAllRegions
};