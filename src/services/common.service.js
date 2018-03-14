const logger = require('winston');
require('dotenv').config();

module.exports = {
    getEnviornmentVariable,
    getParamValue
};

function isSubstringOfElement(s, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i].indexOf(s) >= 0) {
            return i;
        }
    }
    return -1;
}

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