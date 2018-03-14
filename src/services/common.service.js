const logger = require('winston');
require('dotenv').config();

module.exports = {
    getEnviornmentVariable
};

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