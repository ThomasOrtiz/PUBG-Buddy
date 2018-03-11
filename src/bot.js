const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs');
const sqlService = require('./sql.service');
require('dotenv').config();

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Bot
const bot = new Discord.Client();
const botToken = getEnviornmentVariable('bot_token');
const prefix = getEnviornmentVariable('prefix');
bot.login(botToken);

bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
// Get commands from the cmd folder
fs.readdir('./src/cmd/', (err, files) => {
    if (err) logger.error(err);
    logger.info(`Loading a total of ${files.length} commands.`);
    files.forEach(f => {
        let props = require(`./cmd/${f}`);
        logger.info(`Loading Command: ${props.help.name}. :ok_hand:`);
        bot.commands.set(props.help.name, props);
        props.conf.aliases.forEach(alias => {
            bot.aliases.set(alias, props.help.name);
        });
    });
});

// Setup DB
sqlService.setupTables();

// Setup events
bot.on('error', logger.error);
bot.on('warn', logger.warn);
bot.on('guildCreate', guild => {
    logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});  
bot.on('guildDelete', guild => {
    sqlService.unRegisterServer(guild.id)
        .then(() => {
            logger.info(`Removed ${guild.name} from database.`);
        });
});
bot.on('ready', () => {
    logger.info(`Bot has started, with ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} guilds.`);
    logger.info('Connected');
});
bot.on('message', msg => {
    // Ignore other bots / requests without our prefix
    if (msg.author.bot || !msg.content.startsWith(prefix)) return;

    let command = msg.content.split(' ')[0].slice(prefix.length);
    let params = msg.content.split(' ').slice(1);
    let perms;
    let isGuildMessage = false;
    
    // Grab relevant guild info if not DM
    if(msg.guild) {
        isGuildMessage = true;
        sqlService.registerServer(msg.guild.id);
        perms = bot.elevation(msg);
    }
    
    // Get command
    let cmd = getCommand(command);
    
    // Run command
    if (cmd && checkIfCommandIsRunnable(msg, cmd, isGuildMessage, perms)) {
        cmd.run(bot, msg, params, perms);
    }
});

bot.reload = function(command) {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./cmd/${command}`)];
            let cmd = require(`./cmd/${command}`);
            bot.commands.delete(command);
            bot.aliases.forEach((cmd, alias) => {
                if (cmd === command) bot.aliases.delete(alias);
            });
    
            bot.commands.set(command, cmd);
            cmd.conf.aliases.forEach(alias => {
                bot.aliases.set(alias, cmd.help.name);
            });
            resolve();
        } catch (e){
            reject(e);
        }
    });
};
bot.elevation = function (msg) {
    /* This function should resolve to an ELEVATION level which
       is then sent to the command handler for verification*/
    let permlvl = 0;
    let mod_role = msg.guild.roles.find('name', 'Mods');
    if (mod_role && msg.member.roles.has(mod_role.id)) permlvl = 2;
    let admin_role = msg.guild.roles.find('name', 'Devs');
    if (admin_role && msg.member.roles.has(admin_role.id)) permlvl = 3;
    if (msg.author.id === process.env.ownerid) permlvl = 4;
    return permlvl;
};

// ----------------------- Helper Methods -----------------------
function getEnviornmentVariable(varName) {
    if(process.env[varName]) {
        return process.env[varName];
    } else {
        logger.error('"' + varName  + '" does not exist - check your .env file.');
        process.exit(-1);
    }
}

/**
 * Given a command name, return the bot's command object
 * @param {string} command 
 * @returns {} command object
 */
function getCommand(command) {
    if (bot.commands.has(command)) {
        return bot.commands.get(command);
    } else if (bot.aliases.has(command)) {
        return bot.commands.get(bot.aliases.get(command));
    }
}

/**
 * Checks if a command is runnable by a user
 * @param {*} msg 
 * @param {*} cmd 
 * @param {*} isGuildMessage 
 * @param {*} perms 
 * @returns {boolean} true if runnable, false otherwise
 */
function checkIfCommandIsRunnable(msg, cmd, isGuildMessage, perms) {
    // Check if cmd is enabled
    if(!cmd.conf.enabled) return false;
    // Check if valid context to run command
    if (!isGuildMessage && cmd.conf.guildOnly) {
        msg.channel.send('Guild only command');
        return false;
    } 
    // Check permissions
    if (perms < cmd.conf.permLevel) { 
        msg.channel.send('Invalid permissions');
        return false;
    }
    return true;
}