const rp = require('request-promise');
const logger = require('winston');
const cheerio = require('cheerio');
const curl = require('curlrequest');
const sql = require('./sql.service');
const cs = require('./common.service');
const Player = require('../models/player');
const SquadSizeEnum = require('../enums/squadSize.enum');

module.exports = {
    getPUBGCharacterData,
    getCharacterID,
    getSquadSizeString,
    isValidMode,
    isValidRegion,
    isValidSeason,
    isValidSquadSize
};

// Webscraping URL --> pubgBaseRL + <username> + pubgServer
const pubgBaseURL = 'https://pubg.op.gg/user/';
const pubgServer = '?server=';
// Direct API URL --> apiURL + <id> + apiOptions
const apiURL = 'https://pubg.op.gg/api/users/'; 
const apiOptions = '/ranked-stats';

/**
 * Returns a pubg character id
 * @param {string} username 
 */
async function getCharacterID(username, region) {
    username = username.toLowerCase();

    return sql.getPlayer(username)
        .then((player) => {
            if(player && player.pubg_id && player.pubg_id !== '') {
                return player.pubg_id;
            } else {
                return webScrapeForId(username, region);
            }
        });
}

/**
 * Using curl this scrapes pubg.op.gg for pubg character id.
 * @param {string} username: pubg username 
 */
function webScrapeForId(username, region) {
    logger.info(`\tWebscraping for ${username} on the ${region} region`);
    let url = pubgBaseURL + username + pubgServer + region;
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
    return SquadSizeEnum.get(squadSize);
}

async function isValidSeason(checkSeason) {
    let seasons = await sql.getAllSeasons();
    for(let i = 0; i < seasons.length; i++) {
        if(seasons[i].season === checkSeason) return true;
    }
    return false;
}

async function isValidRegion(checkRegion) {
    let regions = await sql.getAllRegions();
    for(let i = 0; i < regions.length; i++) {
        if(regions[i].shortname === checkRegion) return true;
    }
    return false;
}

async function isValidMode(checkMode) {
    let modes = await sql.getAllModes();
    for(let i = 0; i < modes.length; i++) {
        if(modes[i].shortname === checkMode) return true;
    }
    return false;
}

async function isValidSquadSize(checkSize) {
    if(!(+checkSize)) {
        return false;
    }
    checkSize = +checkSize;
    let squadSizes = await sql.getAllSquadSizes();
    for(let i = 0; i < squadSizes.length; i++) {
        if(squadSizes[i].size === checkSize) return true;
    }
    return false;
}