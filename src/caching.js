const fs = require('fs');
const logger = require('winston');

module.exports = {
    getUserToIdCache: getUserToIdCache,
    readJSONFromFile: readJSONFromFile,
    writeJSONToFile: writeJSONToFile
};

/**
 * Reads json from file
 * @param {string} fileName 
 */
function readJSONFromFile(fileName) {
    let inputBuffer = fs.readFileSync(fileName);
    try {
        return JSON.parse(inputBuffer);
    } catch (e) {
        return {}; 
    }
}

/**
 * Write json to output file
 * @param {string} fileName 
 * @param {json} json 
 */
function writeJSONToFile(fileName, json) {
    fs.writeFile(fileName, JSON.stringify(json, null, 4), () => {
        logger.log('---- Wrote to ' + fileName + ' ----');
    }, (err) => {
        logger.error(err);
    });
}

/** 
 * Retreives basic json caching of username:id mapping
 */
function getUserToIdCache() {
    let json = readJSONFromFile('./output/caching.json');
    return json;
}
