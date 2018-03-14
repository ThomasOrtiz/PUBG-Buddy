const logger = require('winston');
require('dotenv').config();

module.exports = {
    getEnviornmentVariable,
    getParamValue
};

/**
 * Returns index of position of a string if it exists as a
 * substring in any of the elements in the array.
 * @param {string} s string to search for
 * @param {string[]} arr array of string
 */
function isSubstringOfElement(s, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i].indexOf(s) >= 0) {
            return i;
        }
    }
    return -1;
}

/**
 * Returns the value of the key=value pair. 
 * @param {string} search parameter to search for
 * @param {array} params array of parameters to search through
 * @param {string} defaultParam default return value if search does not exist
 */
function getParamValue(search, params, defaultParam) {
    let index = isSubstringOfElement(search, params);
    if(index >= 0) {
        return params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
    } else {
        return defaultParam;
    }
}

/**
 * Attempts to get an .env value.
 * @param {string} varName in an .env file
 * @returns value if exists, errors out otherwise.
 */
function getEnviornmentVariable(varName) {
    if(process.env[varName]) {
        return process.env[varName];
    } else {
        logger.error('"' + varName  + '" does not exist - check your .env file.');
        process.exit(-1);
    }
}