import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { version } from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class Info extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'info',
        description: 'Returns details about the bot',
        usage: '<prefix>info',
        examples: [
            '!pubg-info'
        ]
    };

    run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        msg.channel.send(`= PUBG Bot Information =
• Owner       :: Thomas Ortiz
• Github      :: https://github.com/Tdortiz/PUBG-Discord-Bot
• Mem Usage   :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Users       :: ${bot.users.size.toLocaleString()}
• Servers     :: ${bot.guilds.size.toLocaleString()}
• Channels    :: ${bot.channels.size.toLocaleString()}
• Discord.js  :: v${version}
• Typescript  :: v2.8.3
• Node        :: ${process.version}`, { code: 'asciidoc' });
    };

}
