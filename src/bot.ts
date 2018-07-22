import { CommonService as cs } from './services/common.service';
import { DiscordClientWrapper } from './DiscordClientWrapper';
import * as Discord from 'discord.js';
import * as fs from 'fs';
import { join } from 'path';
import * as logger from './services/logger.service';
import { SqlServerService as sqlService } from './services/sql.service';
import { Command } from './models/command';
import * as commands from './cmd/command_module';
import { Server } from './models/server';


// Initialize Bot
const botToken: string = cs.getEnvironmentVariable('bot_token');
let prefix: string = cs.getEnvironmentVariable('prefix');
const bot: DiscordClientWrapper = new DiscordClientWrapper();
bot.login(botToken);

// Get commands from the cmd folder
bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
RegisterCommands();


// Setup events
bot.on('unhandledRejection', error => { logger.error(`Uncaught Promise Rejection:\n${error}`); });
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
bot.on('message', async (msg: Discord.Message) => {
    // Ignore other bots
    if (msg.author.bot) return;

    let isGuildMessage: boolean = false;
    let perms: number;
    let command: any;
    let params: string[];

    // Grab relevant guild info if not DM
    if(msg.guild) {
        isGuildMessage = true;
        let server_defaults: Server = await sqlService.getOrRegisterServer(msg.guild.id);
        prefix = server_defaults.default_bot_prefix;
        perms = bot.elevation(msg);
    }

    // Ignore requests without our prefix
    if (!msg.content.startsWith(prefix)) return;
    command = msg.content.split(' ')[0].slice(prefix.length);
    params = msg.content.split(' ').slice(1);

    // Get command
    let cmd: Command = getCommand(command);

    // Run command
    if (cmd && checkIfCommandIsRunnable(msg, cmd, isGuildMessage, perms)) {
        cmd.run(bot, msg, params, perms);
    }
});
bot.reload = function(command): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./cmd/${command}`)];
            let cmd: any = require(`./cmd/${command}`);
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

/**
 * This function should resolve to an ELEVATION level which
 * is then sent to the command handler for verification
 */
bot.elevation = function (msg): number {
    let permlvl: number = 0;
    const hasAdminPermissions: boolean = msg.member.hasPermission('ADMINISTRATOR');
    if(hasAdminPermissions) { permlvl = 4; }

    return permlvl;
};

// ----------------------- Helper Methods -----------------------
/**
 * Registers the commands in the src/cmd folder
 */
function RegisterCommands() {
    const isDirectory = source => fs.lstatSync(source).isDirectory();
    const getDirectories = source => fs.readdirSync(source).map(name => join(source, name)).filter(isDirectory);
    const dirs: string[] = getDirectories('./src/cmd/');

    // Loop through cmd/<cmd-type> folders to grab commands
    dirs.forEach((folder: string) => {
        fs.readdir(folder, (err: NodeJS.ErrnoException, files: string[]) => {
            if (err) { logger.error(err.message); }

            files.forEach((f: string) => {
                let fileName: string = f.split('.')[0];
                let uppercaseName: string = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                let commandClass: any = commands[uppercaseName];
                let command: Command = new commandClass();
                logger.info(`Loading Command: ${command.help.name}.`);
                bot.commands.set(command.help.name, command);
                command.conf.aliases.forEach(alias => {
                    bot.aliases.set(alias, command.help.name);
                });
            });
        });
    });
}

/**
 * Given a command name, return the bot's command object
 * @param {string} command
 * @returns {} command object
 */
function getCommand(command: string): Command {
    if (bot.commands.has(command)) {
        return bot.commands.get(command);
    } else if (bot.aliases.has(command)) {
        return bot.commands.get(bot.aliases.get(command));
    }
}

/**
 * Checks if a command is runnable by a user
 * @param {Discord.Message} msg
 * @param {any} cmd
 * @param {boolean} isGuildMessage
 * @param {any} perms
 * @returns {boolean} true if runnable, false otherwise
 */
function checkIfCommandIsRunnable(msg: Discord.Message, cmd: any, isGuildMessage: boolean, perms: any): boolean {
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
