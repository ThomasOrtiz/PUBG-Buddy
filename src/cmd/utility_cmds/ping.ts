import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class Ping extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'ping',
        description: 'Check your ping to the bot',
        usage: '<prefix>ping',
        examples: [
            '!pubg-ping'
        ]
    };

    run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        msg.channel.send('Ping?').then((message: Discord.Message) => {
            message.edit(`Pong! (took: ${message.createdTimestamp - msg.createdTimestamp}ms)`);
        });
    };

}
