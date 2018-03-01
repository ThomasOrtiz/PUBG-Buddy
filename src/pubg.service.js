const rp = require('request-promise');
const logger = require('winston');
const caching = require('./caching.js');
const cheerio = require('cheerio');
const curl = require('curlrequest');

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
const apiOptions = '/ranked-stats?season=2018-02&server=na&queue_size=4&mode=fpp';

/**
 * Aggregates data by either:
 *      (1) Webscraping if we do not have a cached id for the user
 *      (2) Api Call if we DO have the cached id
 * @param {string[]} names: array of pubg names
 * @param {json} nameToIdMapping: a dictionary of name:id mappings
 */
async function aggregateData(nameToIdMapping) {
    let data = { };
    let characters = new Array();

    for(var username in nameToIdMapping) {
        var id = await getCharacterID(nameToIdMapping, username);
        var characterInfo = await getPUBGCharacterData(id, username);
        characters.push(characterInfo);
    }
    data.characters = characters;

    // Sorting Array based off of ranking (higher ranking is ranking)
    data.characters.sort(function(a, b){ return b.ranking - a.ranking; });

    caching.writeJSONToFile('./output/output.json', data);

    updateIDs(data);

    return data;
}

/**
 * Using curl this scrapes pubg.op.gg for pubg character id.
 * @param {string} username: pubg username 
 */
async function getCharacterID(mapping, username) {
    username = username.toLowerCase();
    let id = mapping[username];
    if(id && id !== '') {
        return id;
    }

    logger.info('Webscraping for ' + username);
    let url = pubgBaseURL + username + pubgNAServer;
    let idPromise = new Promise(function(resolve, reject){ 
        curl.request(url, (err, stdout) => {
            if(err) { reject(err); }

            let $ = cheerio.load(stdout);
            id = $('#userNickname').attr('data-user_id');

            updateIDs({ characters: [ { nickname: username, id: id } ] });
            resolve(id);
        });
    });
    
    return idPromise; 
}

/**
 * Makes a api call to pubg.op.gg/api/
 * @param {string} id: pubg api id
 * @param {string} username: pubg username
 */
async function getPUBGCharacterData(id, username) {
    logger.info('\tApi call for ' + username);
    var url = apiURL + id + apiOptions;

    return rp({ url: url, json: true })
        .then((json) => {
            return { 
                id: id, 
                nickname: username, 
                ranking: json.stats.rating, 
                topPercent: Math.round((json.ranks.rating/json.max_ranks.rating)*100 * 100) / 100 + '%'
            };
        }, () => {
            logger.info('\t\tInvalid season data');
            return {
                id: id,
                nickname: username,
                ranking: 0,
                topPercent: 100 + '%'
            };
        });
}

/**
 * Update the name:id mapping in ../output/caching.json
 * @param {json} data 
 */
function updateIDs(data) {
    // Read in any pre-existing ids
    var json = caching.readJSONFromFile('./output/caching.json');

    // Update name:id mapping
    var characters = data.characters;
    for(var i = 0; i < characters.length; i++){
        var character = characters[i];
        json[character.nickname] = character.id;
    }

    caching.writeJSONToFile('./output/caching.json', json);
}