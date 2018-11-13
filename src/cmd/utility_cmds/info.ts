import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { AnalyticsService as analyticsService } from '../../services';


export class Info extends Command {

    conf: CommandConfiguration = {
        group: 'Utility',
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
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        const links: string[] = [
            '[Discord Bots Page](https://discordbots.org/bot/417828293019041804)',
            '[Github](https://github.com/Tdortiz/PUBG-Discord-Bot)',
            '[Discord Support Server](https://discord.gg/6kVvTwD)',
            '[Paypal](https://www.paypal.me/thomasortiz95) or Venmo **@ThomasOrtiz95**'
        ];

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`PUBG Buddy Information`)
            .setThumbnail(bot.user.displayAvatarURL)
            .setColor(0x00AE86)
            .addField('Owner', 'Thomas Ortiz - Thomas#1442')
            .addBlankField()
            .addField('Links', links.join('\n'))
            .addBlankField()
            .addField('Uptime', this.getUptime(bot.uptime))
            .addField('Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
            .addBlankField()
            .addField('Users', bot.users.size.toLocaleString(), true)
            .addField('Servers', bot.guilds.size.toLocaleString(), true)
            .addField('Channels', bot.channels.size.toLocaleString(), true);

        msg.channel.send({embed});
    }

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
