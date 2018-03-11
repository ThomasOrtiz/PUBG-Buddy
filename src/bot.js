const Discord = require('discord.js');
const logger = require('winston');
const fs = require('fs');
const config = require('../config.json');
const sqlService = require('./sql.service');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Bot
const bot = new Discord.Client();
let botToken;
if(process.env.bot_token) {
    botToken = process.env.bot_token;
} else if(config.botToken) {
    botToken = config.botToken;
} else {
    logger.error('Token does not exist - check your config.json file.');
}

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

bot.on('error', logger.error);
bot.on('warn', logger.warn);
bot.on('guildCreate', guild => {
    // This event triggers when the bot joins a guild.
    logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});  
bot.on('guildDelete', guild => {
    // this event triggers when the bot is removed from a guild.
    sqlService.unRegisterServer(guild.id)
        .then(() => {
            logger.info(`I have been removed from: ${guild.name} (id: ${guild.id})`);
        });
});
bot.on('ready', () => {
    logger.info(`Bot has started, with ${bot.users.size} users, in ${bot.channels.size} channels of ${bot.guilds.size} guilds.`);
    logger.info('Connected');
});
bot.on('message', msg => {
    // Ignore other bots / requests without our prefix
    if (msg.author.bot || !msg.content.startsWith(config.prefix)) return;
    
    // Add server to registered server list
    sqlService.registerServer(msg.guild.id);

    
    let command = msg.content.split(' ')[0].slice(config.prefix.length);
    let params = msg.content.split(' ').slice(1);
    let perms = bot.elevation(msg);
    let cmd;
    if (bot.commands.has(command)) {
        cmd = bot.commands.get(command);
    } else if (bot.aliases.has(command)) {
        cmd = bot.commands.get(bot.aliases.get(command));
    }
    if (cmd) {
        if (perms < cmd.conf.permLevel) return;
        //msg.channel.startTyping();
        cmd.run(bot, msg, params, perms);
        //msg.channel.stopTyping();
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
    if (msg.author.id === config.ownerid) permlvl = 4;
    return permlvl;
};