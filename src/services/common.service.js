const logger = require('winston');
require('dotenv').config();

module.exports = {
    getEnvironmentVariable,
    getParamValue,
    getPercentFromFraction,
    handleError,
    round
};

/**
 * 
 * @param {discord.client} msg: discord client
 * @param {string} errMessage: error string
 * @param {obj} help: command help object 
 */
function handleError(msg, errMessage, help) {
    let message = `${errMessage}\n`;
    if(help) {
        message += `\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`;
    }
    msg.channel.send(message, { code: 'asciidoc'});
}

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
function getEnvironmentVariable(varName) {
    if(process.env[varName]) {
        return process.env[varName];
    } else {
        logger.error('"' + varName  + '" does not exist - check your .env file.');
        process.exit(-1);
    }
}

/**
 * Given a fraction it will return the equivalent % with '%' tacked on
 * @param {*} num 
 * @param {*} den 
 */
function getPercentFromFraction(num, den) {
    if(num === 0 || den === 0) return '0%';
    return round((num/den)*100) + '%'; 
    //Math.round((num/den)*100 * 100) / 100 + '%';
}

/**
 * Given a number it will round it to the nearest 100th place
 * @param {*} num 
 */
function round(num) {
    return Math.round(num * 100) / 100;
}