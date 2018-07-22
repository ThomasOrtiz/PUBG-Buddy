import * as logger from 'winston';
import * as fs from 'fs';

// Ensure that a log folder will exist for log files
fs.mkdir('./logs', (err) => { /* no-op */ });

// Standardize log settings
logger.configure({
    level: 'debug',
    exitOnError: false,
    format: logger.format.combine(
        logger.format.colorize(),
        logger.format.timestamp(),
        logger.format.printf(info => {
            return `${info.timestamp} ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new logger.transports.Console(),
        new logger.transports.File({ filename: 'logs/app.log'}),
        new logger.transports.File({ filename: 'logs/info.log', level: 'info' }),
        new logger.transports.File({ filename: 'logs/error.log', level: 'error' })
    ],
    exceptionHandlers: [
        new logger.transports.File({ filename: 'logs/exceptions.log' })
    ]
});

export = logger
