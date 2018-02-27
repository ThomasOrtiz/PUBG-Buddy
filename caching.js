const fs = require('fs');

module.exports = {
    getCaching: getCaching,
    getJSONFromFile: getJSONFromFile,
    writeJSONToFile: writeJSONToFile
};

/**
 * Reads json from file
 * @param {string} fileName 
 */
function getJSONFromFile(fileName) {
    var inputBuffer = fs.readFileSync(fileName);
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
    fs.writeFile(fileName, JSON.stringify(json, null, 4), function(err) {
        console.log('---- Wrote to ' + fileName + ' ----');
    });
}

/** 
 * Retreives basic json caching of username:id mapping
 */
function getCaching() {
    var json = getJSONFromFile('caching.json');
    return json;
}
