const cs = require('./src/services/common.service');
const fs = require('fs');
const { Pool } = require('pg');
const logger = require('winston');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.level = 'debug';

let connectionString = cs.getEnvironmentVariable('DATABASE_URL');
const pool = new Pool({
    connectionString: connectionString,
    ssl: true,
});

logger.info('Starting migrations ...');

fs.readdir('./migrations', function(err, files) {
    logger.info(`Migrating ${files.length} file(s)`);
    if(err) {
        logger.error('Could not list the directory.', err);
        process.exit(1);
    }

    files.forEach((file, index) => {
        logger.info(`\t[${index}] Migrating: ${file.toString()}`);
        let sql = fs.readFileSync('./migrations/' + file).toString();
        //logger.log('sql', sql);
        pool.query(sql);
    });
    logger.info('Finished migrating!');
});