const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs');
const cs = require('./services/common.service');
const sqlService = require('./services/sql.service');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.level = 'debug';

// Initialize Bot
const bot = new Discord.Client();
const botToken = cs.getEnvironmentVariable('bot_token');
let prefix = cs.getEnvironmentVariable('prefix');
bot.login(botToken);

// Get commands from the cmd folder
bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
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

// Setup events
bot.on('error', logger.error);
bot.on('warn', logger.warn);
bot.on('guildCreate', guild => {
    sqlService.registerServer(guild.id).then(() => {
        logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    });
});  
bot.on('guildDelete', guild => {
    sqlService.unRegisterServer(guild.id).then(() => {
        logger.info(`Removed ${guild.name} from database.`);
    });
});
bot.on('ready', () => {
    logger.info(`Bot has started, with ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} guilds.`);
    logger.info('Connected');
});
bot.on('message', async msg => {
    // Ignore other bots 
    if (msg.author.bot) return;

    let isGuildMessage = false;
    let perms;
    let command;
    let params;

    // Grab relevant guild info if not DM
    if(msg.guild) {
        isGuildMessage = true;
        let server_defaults = await sqlService.getOrRegisterServer(msg.guild.id);
        prefix = server_defaults.default_bot_prefix;
        perms = bot.elevation(msg);
    }

    // Ignore requests without our prefix
    if (!msg.content.startsWith(prefix)) return;
    command = msg.content.split(' ')[0].slice(prefix.length);
    params = msg.content.split(' ').slice(1);
    
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
    
    let hasAdminPermissions = msg.member.hasPermission('ADMINISTRATOR');
    if(hasAdminPermissions) permlvl = 4;

    return permlvl;
};

// ----------------------- Helper Methods -----------------------

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
    //logger.info('user_perms = ' + perms + '; cmd_permission = ' + cmd.conf.permLevel);
    if (perms < cmd.conf.permLevel) { 
        msg.channel.send('Invalid permissions');
        return false;
    }
    return true;
}