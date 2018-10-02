import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {SqlServerService as sqlService} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp, Server } from '../../models/models.module';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';


export class Help extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [''],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'help',
        description: 'Returns help topics.',
        usage: '<prefix>help [command]',
        examples: [
            '<prefix>',
            '!pubg-',
            '!pubg-help',
            '!pubg-help rank',
            '!pubg-help top'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            mixpanel.track(this.help.name, {
                distinct_id: msg.author.id,
                type: 'Help',
                discord_id: msg.author.id,
                discord_username: msg.author.tag
            });
            this.printBotHelp(bot, msg);
        } else {
            mixpanel.track(this.help.name, {
                distinct_id: msg.author.id,
                type: 'Command Help',
                discord_id: msg.author.id,
                discord_username: msg.author.tag,
                helpKey: params[0]
            });
            this.printCommandHelp(bot, msg, params[0]);
        }
    };

    private async printBotHelp(bot: DiscordClientWrapper, msg: Discord.Message) {
        let default_bot_prefix: string = cs.getEnvironmentVariable('prefix');
        let prefix: string = default_bot_prefix;

        if(msg.guild) {
            let server_defaults: Server = await sqlService.getServerDefaults(msg.guild.id);
            prefix = server_defaults.default_bot_prefix;
        }

        let prefix_explanation: string = '= Bot Prefix and PUBG Defaults Explanation = \n\n' +
                                    'This bot\'s prefix and PUBG specific defaults are configurable if on a server through the `setServerDefaults` command.\n\n' +
                                    'Default Server Prefix:\t "' + default_bot_prefix + '"\n' +
                                    'Current Server Prefix:\t "' + prefix + '"';
        let commandList: string = '';
        bot.commands.map(c => {
            let str = '';
            const row =  `${c.help.name} :: ${c.help.description}`;

            switch (c.help.name) {
                case 'compare':
                    str += `\n\n== PUBG Commands == \n\t${row}\n`
                    break;
                case 'addUser':
                    str += `\n\n== Server Commands == \n\t${row}\n`
                    break;
                case 'help':
                    str += `\n\n== Utility Commands == \n\t${row}\n`
                    break;
                default:
                    str += `\t${row}\n`;
                    break;
            }

            commandList += str;
        });
        let parameterExplanation: string = '\n= Parameter Explanation =\n' +
                                    'See available parameters by calling the following commands: "modes", "regions", and "seasons".`\n\n' +
                                    '\trequired :: <parameter> \n' +
                                    '\toptional :: [parameter]\n' +
                                    '\tselect one :: (option1 | option2 | option3)\n' +
                                    '\trequired select one :: <(option1 | option2 | option3)>\n' +
                                    '\toptional select one :: [(option1 | option2 | option3)]\n\n';

        msg = await msg.channel.send(`${prefix_explanation}\n\n= Command List =\n[Use "<prefix>help <commandname>" for details]${commandList}${parameterExplanation}`, { code: 'asciidoc'}) as Discord.Message;
    }

    private printCommandHelp(bot: DiscordClientWrapper, msg: Discord.Message, commandName : string) {
        if (bot.commands.has(commandName)) {
            const commandObj: Command = bot.commands.get(commandName);
            let exampleList: string = commandObj.help.examples.map(e=>`${e}`).join('\n');
            let examples: string = `\n\n= Examples =\n\n${exampleList}`;

            msg.channel.send(`= ${commandObj.help.name} = \n${commandObj.help.description}\nusage:: ${commandObj.help.usage}${examples}`, { code: 'asciidoc'});
        }
    }
}
