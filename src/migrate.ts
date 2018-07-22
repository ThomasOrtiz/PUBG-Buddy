import * as pool from './services/sql-services/sql.config.service';
import * as logger from './services/logger.service';
import { readdir, readFileSync } from 'fs';


logger.info('Starting migrations ...');

readdir('./migrations', function(err, files) {
    logger.info(`Migrating ${files.length} file(s)`);
    if(err) {
        logger.error('Could not list the directory.', err);
        process.exit(1);
    }

    files.forEach((file, index) => {
        logger.info(`\t[${index}] Migrating: ${file.toString()}`);
        let sql = readFileSync('./migrations/' + file).toString();
        //logger.log('sql', sql);
        pool.query(sql);
    });
    logger.info('Finished migrating!');
});
