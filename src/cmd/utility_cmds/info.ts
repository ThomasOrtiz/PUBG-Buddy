import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { version } from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';


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
        mixpanel.track(this.help.name, {
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        msg.channel.send(`= PUBG Bot Information =
• Owner       :: Thomas Ortiz
• Github      :: https://github.com/Tdortiz/PUBG-Discord-Bot
• Bot Discord :: https://discord.gg/6kVvTwD
• Uptime      :: ${this.getUptime(bot.uptime)}
• Mem Usage   :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Users       :: ${bot.users.size.toLocaleString()}
• Servers     :: ${bot.guilds.size.toLocaleString()}
• Channels    :: ${bot.channels.size.toLocaleString()}
• Discord.js  :: v${version}
• Typescript  :: v2.8.3
• Node        :: ${process.version}`, { code: 'asciidoc' });
    };

    private getUptime(botUptime): string {

        let totalSeconds = (botUptime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const uptime = `${hours} hours, ${minutes} minutes, and ${seconds} seconds`;

        return uptime;
    }

}
