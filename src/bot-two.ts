import * as Discord from 'discord.js';
import * as fs from 'fs';
import { join } from 'path';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    SqlServerService as sqlService
 } from './services';
import { Command, DiscordClientWrapper } from './entities';
import { Server } from './interfaces'
import * as commands from './cmd';
import * as logger from './config/logger.config';


export class DiscordBot {

    private prefix: string = cs.getEnvironmentVariable('prefix');
    private bot: DiscordClientWrapper;

    constructor() {
        const botToken: string = cs.getEnvironmentVariable('bot_token');
        this.bot = new DiscordClientWrapper();
        this.setupListeners();
        this.bot.login(botToken);
        this.bot.commands = new Discord.Collection();
        this.bot.aliases = new Discord.Collection();
        this.registerCommands();
    }

    private setupListeners = () => {
        // Setup events
        this.bot.on('unhandledRejection', error => { logger.error(`Uncaught Promise Rejection:\n${error}`); });
        this.bot.on('error', logger.error);
        this.bot.on('warn', logger.warn);
        this.bot.on('guildCreate', guild => {
            sqlService.registerServer(guild.id).then(() => {
                logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
                analyticsService.track('New Discord server', {
                    guildName: guild.name,
                    guildId: guild.id,
                    memberCount: guild.memberCount
                });
            });
        });
        this.bot.on('guildDelete', guild => {
            sqlService.unRegisterServer(guild.id).then(() => {
                analyticsService.track('Removed Discord server', {
                    guildName: guild.name,
                    guildId: guild.id,
                    memberCount: guild.memberCount
                });
                logger.info(`Removed ${guild.name} from database.`);
            });
        });
        this.bot.on('ready', () => {
            logger.info(`Bot has started, with ${this.bot.users.size} users, in ${this.bot.channels.size} channels of ${this.bot.guilds.size} guilds.`);
            logger.info('Connected');
            this.bot.user.setActivity("Use `!pubg-help`");
        });
        this.bot.on('message', this.onMessage);
        this.bot.reload = function(command): Promise<any> {
            return new Promise((resolve, reject) => {
                try {
                    delete require.cache[require.resolve(`./cmd/${command}`)];
                    let cmd: any = require(`./cmd/${command}`);
                    this.bot.commands.delete(command);
                    this.bot.aliases.forEach((cmd, alias) => {
                        if (cmd === command) this.bot.aliases.delete(alias);
                    });

                    this.bot.commands.set(command, cmd);
                    cmd.conf.aliases.forEach(alias => {
                        this.bot.aliases.set(alias, cmd.help.name);
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
        this.bot.elevation = function (msg): number {
            let permlvl: number = 0;
            const hasAdminPermissions: boolean = msg.member.hasPermission('ADMINISTRATOR');
            if(hasAdminPermissions) { permlvl = 4; }

            return permlvl;
        };
    }

    /**
     * Registers the commands in the src/cmd folder
     */
    private registerCommands = () => {
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
                    this.bot.commands.set(command.help.name, command);
                    command.conf.aliases.forEach(alias => {
                        this.bot.aliases.set(alias, command.help.name);
                    });
                });
            });
        });
    }

    private onMessage = async (msg: Discord.Message) => {
        let isGuildMessage: boolean = false;
        let perms: number;
        let command: any;
        let params: string[];

        // Grab relevant guild info if not DM
        if(msg.guild) {
            isGuildMessage = true;
            let server_defaults: Server = await sqlService.getOrRegisterServer(msg.guild.id);
            this.prefix = server_defaults.default_bot_prefix.toLowerCase();
            perms = this.bot.elevation(msg);
        }

        // Check for special case with default help
        const startsWithDefaultHelp = msg.content.toLowerCase().startsWith('!pubg-help');
        if (startsWithDefaultHelp) {
            command = msg.content.split(' ')[0].slice('!pubg-'.length);
            params = msg.content.split(' ').slice(1);
            // Get command
            let cmd: Command = this.getCommand(command);

            // Run command
            if (cmd && this.checkIfCommandIsRunnable(msg, cmd, isGuildMessage, perms)) {
                cmd.run(this.bot, msg, params, perms);
            }
            return;
        }

        // Ignore requests without our prefix
        if (!msg.content.toLowerCase().startsWith(this.prefix)) { return; }
        command = msg.content.split(' ')[0].slice(this.prefix.length);
        params = msg.content.split(' ').slice(1);

        // Get command
        let cmd: Command = this.getCommand(command);

        // Run command
        if (cmd && this.checkIfCommandIsRunnable(msg, cmd, isGuildMessage, perms)) {
            analyticsService.setPerson(msg.author.id, {});
            cmd.run(this.bot, msg, params, perms);
        }
    }

    /**
     * Given a command name, return the bot's command object
     * @param {string} command
     * @returns {} command object
     */
    private getCommand = (command: string): Command => {
        if (this.bot.commands.has(command)) {
            return this.bot.commands.get(command);
        } else if (this.bot.aliases.has(command)) {
            return this.bot.commands.get(this.bot.aliases.get(command));
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
    private checkIfCommandIsRunnable = (msg: Discord.Message, cmd: any, isGuildMessage: boolean, perms: any): boolean => {
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

}
