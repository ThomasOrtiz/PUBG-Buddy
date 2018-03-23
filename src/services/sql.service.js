const PlayerSql = require('./sql.player.service');
const ServerSql = require('./sql.server.service');
const SeasonsSql = require('./sql.seasons.service');
const ServerRegisterySql = require('./sql.serverRegistery.service');
const ModesSql = require('./sql.modes.service');
const RegionsSql = require('./sql.regions.service');
const SquadSizeSql = require('./sql.squadSize.service');

module.exports = {
    // Seasons
    getLatestSeason: SeasonsSql.getLatestSeason,
    getAllSeasons: SeasonsSql.getAllSeasons,
    // Servers
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