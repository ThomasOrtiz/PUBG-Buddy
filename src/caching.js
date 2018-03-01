const fs = require('fs');

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
    fs.writeFileSync(fileName, JSON.stringify(json, null, 4));
}

/** 
 * Retreives basic json caching of username:id mapping
 */
function getUserToIdCache() {
    let json = readJSONFromFile('./output/caching.json');
    return json;
}
