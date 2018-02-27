const request = require('request');
const rp = require('request-promise');
const phantom = require('phantom');
const caching = require('./caching');

module.exports = {
    aggregateData: aggregateData,
    getPUBGCharacterData: getPUBGCharacterData,
    getCharacterID: getCharacterID
};

// Webscraping URL --> pubgBaseRL + <nickname> + pubgNAServer
const pubgBaseURL = 'https://pubg.op.gg/user/'
const pubgNAServer = '?server=na';
// Direct API URL --> baseAPIURL + <id> + APIOptionsURL
const directBaseAPIURL = 'https://pubg.op.gg/api/users/'; 
const APIOptionsURL = '/ranked-stats?season=2018-02&server=na&queue_size=4&mode=fpp'

/**
 * Aggregates data by either:
 *      (1) Webscraping if we do not have a cached id for the user
 *      (2) Api Call if we DO have the cached id
 * @param {string[]} names: array of pubg names
 * @param {json} nameToIdMapping: a dictionary of name:id mappings
 */
async function aggregateData(nameToIdMapping) {
    console.log('---- Aggregating Data ----');
    data = { };
    characters = new Array();

    for(var username in nameToIdMapping) {
        var id = await getCharacterID(nameToIdMapping, username);
        var characterInfo = await getPUBGCharacterData(id, username);
        characters.push(characterInfo);
    }
    data.characters = characters;

    // Sorting Array based off of ranking (higher ranking is ranking)
    data.characters.sort(function(a, b){ return b.ranking - a.ranking; });

    caching.writeJSONToFile('output.json', data);

    updateIDs(data);

    return data;
}

/**
 * Using phantomJS this scrapes pubg.op.gg for pubg character id.
 * @param {string} username: pubg username 
 */
async function getCharacterID(mapping, username) {
    username = username.toLowerCase();
    let id = mapping[username];
    if(id && id !== '') {
        return id;
    }

    console.log('\tWebscraping for ' + username);
    // Setup PhantomJS Page
    const instance = await phantom.create();
    const page = await instance.createPage();

    // Evaluate and Extract Data
    url = pubgBaseURL + username + pubgNAServer;
    await page.open(url);
    await page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js');
    
    id = await page.evaluate(function() {
        try {
            var idElement = $('#userNickname')
            return idElement.attr('data-user_id');
        } catch(err) {
            console.error('Id element does not exist');
            return -1;
        }
    });

    updateIDs({ characters: [ { nickname: username, id: id } ] });

    // Cleanup PhantomJS
    await instance.exit();
    return id;
}

/**
 * Makes a api call to pubg.op.gg/api/
 * @param {string} id: pubg api id
 * @param {string} username: pubg username
 */
async function getPUBGCharacterData(id, username) {
    console.log('\tApi call for ' + username);
    var url = directBaseAPIURL + id + APIOptionsURL;
    var characterData = {};

    return rp({ url: url, json: true })
    .then((json) => {
        return { 
            id: id, 
            nickname: username, 
            ranking: json.stats.rating, 
            topPercent: Math.round((json.ranks.rating/json.max_ranks.rating)*100 * 100) / 100 + '%'
        };
    }, (err) => {
        console.log('\t\tInvalid season data');
        return {
            id: id,
            nickname: username,
            ranking: 0,
            topPercent: 100 + '%'
        }
    });
}

/**
 * Update the name:id mapping in caching.json
 * @param {json} data 
 */
function updateIDs(data) {
    // Read in any pre-existing ids
    var json = caching.getJSONFromFile('caching.json');

    // Update name:id mapping
    var characters = data.characters;
    for(var i = 0; i < characters.length; i++){
        var character = characters[i];
        json[character.nickname] = character.id;
    }

    caching.writeJSONToFile('caching.json', json);
}