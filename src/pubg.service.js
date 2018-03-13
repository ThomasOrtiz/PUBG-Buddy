const rp = require('request-promise');
const logger = require('winston');
const cheerio = require('cheerio');
const curl = require('curlrequest');
const sql = require('./sql.service');

module.exports = {
    aggregateData: aggregateData,
    getPUBGCharacterData: getPUBGCharacterData,
    getCharacterID: getCharacterID
};

// Webscraping URL --> pubgBaseRL + <nickname> + pubgNAServer
const pubgBaseURL = 'https://pubg.op.gg/user/';
const pubgNAServer = '?server=na';
// Direct API URL --> apiURL + <id> + apiOptions
const apiURL = 'https://pubg.op.gg/api/users/'; 
const apiOptions = '/ranked-stats';

/**
 * Aggregates data by either:
 *      (1) Api Call if we DO have the cached id
 *      (2) Webscraping if we do not have a cached id for the user
 *          and then performing API call
 * @param {string[]} names: array of pubg names
 * @param {json} nameToIdMapping: a dictionary of name:id mappings
 */
async function aggregateData(players, season, region, squadSize, mode) {
    let playersInfo = new Array();
    for(let i = 0; i < players.length; i++) {
        let player = players[i];
        let id = await getCharacterID(player.username);
        let characterInfo = await getPUBGCharacterData(id, player.username, season, region, squadSize, mode);
        playersInfo.push(characterInfo);
    }

    // Sorting Array based off of ranking (higher ranking is ranking)
    playersInfo.sort(function(a, b){ return b.ranking - a.ranking; });

    return playersInfo;
}

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

            await sql.addPlayer(username, id);
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
 */
async function getPUBGCharacterData(id, username, season, region, squadSize, mode) {
    logger.info('\tApi call for ' + username);
    var url = apiURL + id + apiOptions + '?season=' + season + '&server=' + region + '&queue_size=' + squadSize + '&mode=' + mode;

    return rp({ url: url, json: true })
        .then((json) => {
            return { 
                id: id, 
                nickname: username, 
                ranking: json.stats.rating,
                grade: json.grade || 'N/A',
                longest_kill: json.stats.longest_kill_max + 'm',
                average_damage_dealt: Math.round(json.stats.damage_dealt_avg * 100) / 100,
                topPercent: Math.round((json.ranks.rating/json.max_ranks.rating)*100 * 100) / 100 + '%'
            };
        }, () => {
            return {
                id: id,
                nickname: username,
                ranking: 0,
                grade: 'N/A',
                longest_kill: 0 + 'm',
                average_damage_dealt: 0,
                topPercent: 100 + '%'
            };
        });
}