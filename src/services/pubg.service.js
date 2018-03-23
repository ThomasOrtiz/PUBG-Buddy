const rp = require('request-promise');
const logger = require('winston');
const cheerio = require('cheerio');
const curl = require('curlrequest');
const sql = require('./sql.service');
const cs = require('./common.service');
const Player = require('../models/player');
const SeasonEnum = require('../enums/season.enum');
const SquadSizeEnum = require('../enums/squadSize.enum');
const ModeEnum = require('../enums/mode.enum');
const RegionEnum = require('../enums/region.enum');


module.exports = {
    getPUBGCharacterData,
    getCharacterID,
    getSquadSizeString,
    isValidMode,
    isValidRegion,
    isValidSeason,
    isValidSquadSize
};

// Webscraping URL --> pubgBaseRL + <username> + pubgNAServer
const pubgBaseURL = 'https://pubg.op.gg/user/';
const pubgNAServer = '?server=na';
// Direct API URL --> apiURL + <id> + apiOptions
const apiURL = 'https://pubg.op.gg/api/users/'; 
const apiOptions = '/ranked-stats';

/**
 * Returns a pubg character id
 * @param {string} username 
 */
async function getCharacterID(username) {
    username = username.toLowerCase();

    return sql.getPlayer(username)
        .then((player) => {
            if(player && player.pubg_id && player.pubg_id !== '') {
                return player.pubg_id;
            } else {
                return webScrapeForId(username);
            }
        });
}

/**
 * Using curl this scrapes pubg.op.gg for pubg character id.
 * @param {string} username: pubg username 
 */
function webScrapeForId(username) {
    logger.info('\tWebscraping for ' + username);
    let url = pubgBaseURL + username + pubgNAServer;
    return new Promise(function(resolve, reject){ 
        curl.request(url, async (err, stdout) => {
            if(err) { reject(err); }

            let $ = cheerio.load(stdout);
            let id = $('#userNickname').attr('data-user_id');
            if(id) {
                await sql.addPlayer(username, id);
            }

            resolve(id);
        });
    });
}

/**
 * Makes a api call to pubg.op.gg/api/
 * @param {string} id: pubg api id
 * @param {string} username: pubg username
 * @param {string} season: season of pubg ['2018-01', '2018-02', '2018-03']
 * @param {string} region: region of play 
 * @param {string} squadSize: solo, duo, squad [1, 2, 4]
 * @param {string} mode: [fpp, tpp]
 * @returns {Player} player: a player object
 */
async function getPUBGCharacterData(id, username, season, region, squadSize, mode) {
    logger.info('\tApi call for ' + username);
    var url = apiURL + id + apiOptions + '?season=' + season + '&server=' + region + '&queue_size=' + squadSize + '&mode=' + mode;

    return rp({ url: url, json: true })
        .then((json) => {
            let player = new Player(id, username);
            player.rank = '#' + json.ranks.rating;
            player.rating = json.stats.rating || '';
            player.grade = json.grade || '?';
            player.headshot_kills = cs.getPercentFromFraction(json.stats.headshot_kills_sum, json.stats.kills_sum);
            player.longest_kill = json.stats.longest_kill_max + 'm';
            player.average_damage_dealt = cs.round(json.stats.damage_dealt_avg );
            player.topPercent = 'Top ' + cs.getPercentFromFraction(json.ranks.rating, json.max_ranks.rating);
            player.winPercent = cs.getPercentFromFraction(json.stats.win_matches_cnt, json.stats.matches_cnt);
            player.topTenPercent = cs.getPercentFromFraction(json.stats.topten_matches_cnt, json.stats.matches_cnt);
            player.kda = cs.round( (json.stats.kills_sum + json.stats.assists_sum) / json.stats.deaths_sum );
            player.kd = cs.round(json.stats.kills_sum/ json.stats.deaths_sum);
            return player;
        }, () => {
            return null;
        });
}

/**
 * Returns the squad size string representation of the int
 * @param {int} squadSize 
 */
function getSquadSizeString(squadSize) {
    return SquadSizeEnum.getKeyFromValue(squadSize);
}

function isValidSeason(checkSeason) {
    return SeasonEnum.isValue(checkSeason);
}

function isValidRegion(checkRegion) {
    return RegionEnum.isValue(checkRegion);
}

function isValidMode(checkMode) {
    return ModeEnum.isValue(checkMode);
}

function isValidSquadSize(checkSize) {
    return SquadSizeEnum.isValue(checkSize);
}