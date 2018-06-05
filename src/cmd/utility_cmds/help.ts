import { Server } from './../../models/server';
import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {SqlServerService as sqlService} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';

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
        let default_bot_prefix: string = cs.getEnvironmentVariable('prefix');
        let prefix: string = default_bot_prefix;

        if(msg.guild) {
            let server_defaults: Server = await sqlService.getServerDefaults(msg.guild.id);
            prefix = server_defaults.default_bot_prefix;
        }

        if (!params[0]) {
            let prefix_explanation: string =    '= Bot Prefix and PUBG Defaults Explanation = \n\n' +
                                    'This bot\'s prefix and PUBG specific defaults are configurable if on a server through the `setServerDefaults` command.\n\n' +
                                    'Default Bot Prefix:   \t"' + default_bot_prefix + '"\n' +
                                    'Current Server Prefix:\t "' + prefix + '"';
            let commandList: string = bot.commands.map(c=>`${c.help.name}:: ${c.help.description}`).join('\n');
            let parameterExplanation: string =  '= Parameter Explanation =\n\n' +
                                        'See available parameters for each type of parameter by calling the following commands: "getModes", "getRegions", "getSquadSizes", and "getSeasons".`\n\n' +
                                        'required:: <parameter> \n' +
                                        'optional:: [parameter]\n' +
                                        'select one:: (option1 | option2 | option3)\n' +
                                        'required select one:: <(option1 | option2 | option3)>\n' +
                                        'optional select one:: [(option1 | option2 | option3)]\n\n';
            let parameterExample: string =  '= Parameter Example =\n\n' +
                                    'pubg-rank <pubg username> [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [mode=(fpp | tpp)]\n\n' +
                                    '"pubg-rank" requires a <pubg username> parameter and takes the following optional parameters: "season=", "region=" and "mode=". Each of these optional parameters ' +
                                    'requires that one of the items within the "()" to be selected. Some valid call of this command is:\n\n' +
                                    '\tpubg-rank johndoe\n' +
                                    '\tpubg-rank johndoe season=2018-03 region=as mode=tpp\n' +
                                    '\tpubg-rank janedoe season=2018-03 mode=tpp\n' +
                                    '\tpubg-rank johndoe region=eu mode=fpp\n' +
                                    '\t...';
            msg.channel.send(`${prefix_explanation}\n\n= Command List =\n\n[Use "<prefix>help <commandname>" for details]\n\n${commandList}`, { code: 'asciidoc'})
                .then(() => {
                    msg.channel.send(`${parameterExplanation}${parameterExample}`, { code: 'asciidoc'});
                });
        } else {
            let command: string = params[0];
            if (bot.commands.has(command)) {
                const commandObj: Command = bot.commands.get(command);
                let exampleList: string = commandObj.help.examples.map(e=>`${e}`).join('\n');
                let examples: string = `\n\n= Examples =\n\n${exampleList}`;

                msg.channel.send(`= ${commandObj.help.name} = \n${commandObj.help.description}\nusage:: ${commandObj.help.usage}${examples}`, { code: 'asciidoc'});
            }
        }
    };
}
