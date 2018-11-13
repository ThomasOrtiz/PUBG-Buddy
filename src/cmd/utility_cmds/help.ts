import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    SqlServerService as sqlService,
    DiscordMessageService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server } from '../../interfaces';


export class Help extends Command {

    conf: CommandConfiguration = {
        group: 'Utility',
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
            analyticsService.track(this.help.name, {
                distinct_id: msg.author.id,
                type: 'Help',
                discord_id: msg.author.id,
                discord_username: msg.author.tag
            });
            const embed = await this.getBotHelpEmbed(bot.commands, msg.guild);

            let parameterExplanation: string = '\n= Parameter Explanation =\n' +
                                    'See available parameters by calling the following commands: "modes", "regions", and "seasons".`\n\n' +
                                    'If a parameter has a space in it you will need to surround it with quotation marks (")\n\n' +
                                    '\trequired :: <parameter> \n' +
                                    '\toptional :: [parameter]\n' +
                                    '\tselect one :: (option1 | option2 | option3)\n' +
                                    '\trequired select one :: <(option1 | option2 | option3)>\n' +
                                    '\toptional select one :: [(option1 | option2 | option3)]\n\n';

            await msg.channel.send(parameterExplanation, { code: 'asciidoc'});
            await msg.channel.send({embed});
        } else {
            analyticsService.track(this.help.name, {
                distinct_id: msg.author.id,
                type: 'Command Help',
                discord_id: msg.author.id,
                discord_username: msg.author.tag,
                helpKey: params[0]
            });
            const commandHelp: string = this.printCommandHelp(bot, msg, params[0]);
            await msg.channel.send(commandHelp, { code: 'asciidoc'});
        }
    };

    private async getBotHelpEmbed(commands: any, guild: Discord.Guild): Promise<Discord.RichEmbed> {
        const embed: Discord.RichEmbed = DiscordMessageService.createBaseEmbed('PUBG Buddy');

        let default_bot_prefix: string = cs.getEnvironmentVariable('prefix');
        let prefix: string = default_bot_prefix;

        if (guild) {
            let server_defaults: Server = await sqlService.getServer(guild.id);
            prefix = server_defaults.default_bot_prefix;
        }

        embed.setDescription(`This bot's prefix and PUBG specific defaults are configurable through the **setup** command`);
        embed.setColor('F2A900');
        embed.addField('Default Prefix', default_bot_prefix, true);
        embed.addField('Custom Prefix', prefix, true);
        embed.addBlankField();

        embed.addField('Command List', 'Use "**<prefix>help <commandname>**" for details on each command')
        const groups: string[] = this.getGroups(commands);
        const commandGroupsArray: Command[][] = [];
        for (let i = 0; i < groups.length; i++) {
            commandGroupsArray.push(commands.filter(c => c.conf.group === groups[i]));
        }

        for (let i = 0; i < commandGroupsArray.length; i++) {
            const groupCommands: Command[] = commandGroupsArray[i];
            let commandHelp: string = '';
            let group: string = '';

            groupCommands.forEach((command: Command) => {
                group = command.conf.group;
                commandHelp += `**${command.help.name}** - ${command.help.description}\n`;
            });

            embed.addField(this.getGroupDisplay(group), commandHelp);
            if (i < commandGroupsArray.length-1) {
                embed.addBlankField();
            }
        }
        return embed;
    }

    private getGroupDisplay(group: string) {
        switch (group) {
            case 'PUBG':
                return `:video_game:  ${group} Commands :video_game:`;
            case 'Server':
                return `:desktop: ${group} Commands :desktop:`;
            case 'Utility':
                return `:gear: ${group} Commands :gear:`;
            default:
                return `${group} Commnads`;
        }
    }

    private getGroups(commands: Command[]): string[] {
        const groups: string[] = [];

        commands.forEach((command: Command) => {
            if (!groups.includes(command.conf.group)) {
                groups.push(command.conf.group);
            }
        });

        return groups;
    }

    private printCommandHelp(bot: DiscordClientWrapper, msg: Discord.Message, commandName : string): string {
        if (bot.commands.has(commandName)) {
            const commandObj: Command = bot.commands.get(commandName);
            let exampleList: string = commandObj.help.examples.map(e=>`${e}`).join('\n');
            let examples: string = `\n\n= Examples =\n\n${exampleList}`;

            return `= ${commandObj.help.name} = \n${commandObj.help.description}\nusage:: ${commandObj.help.usage}${examples}`;
        }
    }
}
