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
        description: 'Returns page details.',
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
                type: 'Help',
                discord_id: msg.author.id,
                discord_username: msg.author.tag
            });
            this.printBotHelp(bot, msg);
        } else {
            mixpanel.track(this.help.name, {
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
                                    'Default Bot Prefix:   \t"' + default_bot_prefix + '"\n' +
                                    'Current Server Prefix:\t "' + prefix + '"';
        let commandList: string = '';
        bot.commands.map(c => {
            let str = '';
            const row =  `${c.help.name}:: ${c.help.description}`;

            switch (c.help.name) {
                case 'matches':
                    str += `\n\n= PUBG Commands = \n${row}\n`
                    break;
                case 'addUser':
                    str += `\n\n= Server Commands = \n${row}\n`
                    break;
                case 'help':
                    str += `\n\n= Utility Commands = \n${row}\n`
                    break;
                default:
                    str += `${row}\n`;
                    break;
            }

            commandList += str;
        });
        let parameterExplanation: string = '= Parameter Explanation =\n\n' +
                                    'See available parameters by calling the following commands: "modes", "regions", and "seasons".`\n\n' +
                                    'required:: <parameter> \n' +
                                    'optional:: [parameter]\n' +
                                    'select one:: (option1 | option2 | option3)\n' +
                                    'required select one:: <(option1 | option2 | option3)>\n' +
                                    'optional select one:: [(option1 | option2 | option3)]\n\n';
        let parameterExample: string = '= Parameter Example =\n\n' +
                                'pubg-rank <pubg username> [season=] [region=] [mode=]\n\n' +
                                '"pubg-rank" requires a <pubg username> parameter and takes the following optional parameters: "season=", "region=" and "mode=". Some valid call of this command is:\n\n' +
                                '\tpubg-rank johndoe\n' +
                                '\tpubg-rank johndoe season=2018-03 region=as mode=tpp\n' +
                                '\tpubg-rank janedoe season=2018-03 mode=tpp\n' +
                                '\tpubg-rank johndoe region=eu mode=fpp\n' +
                                '\t...';
        msg = await msg.channel.send(`${prefix_explanation}\n\n= Command List =\n\n[Use "<prefix>help <commandname>" for details]${commandList}`, { code: 'asciidoc'}) as Discord.Message;
        msg.channel.send(`${parameterExplanation}${parameterExample}`, { code: 'asciidoc'});
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
