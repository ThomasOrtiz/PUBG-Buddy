import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { AnalyticsService, PubgPlatformService, DiscordMessageService } from '../../services';
import { PlatformRegion, Status } from '../../pubg-typescript-api';


export class Ping extends Command {

    conf: CommandConfiguration = {
        group: 'Utility',
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

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        const reply: Discord.Message = await msg.channel.send('Ping?') as Discord.Message;

        const embed: Discord.RichEmbed = DiscordMessageService.createBaseEmbed('PUBG-Buddy Status');
        embed.setDescription('');
        embed.setThumbnail(bot.user.displayAvatarURL);
        embed.setColor(0x00AE86);
        embed.addField('API Heartbeat', `${Math.round(bot.ping)}ms`, true);
        embed.addField('API Latency', `${reply.createdTimestamp - msg.createdTimestamp}ms`, true);

        reply.edit({embed});

        const platforms: PlatformRegion[] = [
            PlatformRegion.XBOX,
            PlatformRegion.STEAM,
            PlatformRegion.KAKAO
        ];
        const promises: Promise<Status>[] = platforms.map(platform => Status.get(PubgPlatformService.getApi(platform)));
        const statuses: Status[] = await Promise.all(promises);

        let status_str: string = '';
        for (let i = 0; i < statuses.length; i++) {
            const platformDisplay: string = PubgPlatformService.getPlatformDisplayName(platforms[i]);
            status_str += `**${platformDisplay}** - ${statuses[i].ping}ms\n`;
        }

        embed.addBlankField();
        embed.addField('PUBG API', status_str);
        reply.edit({embed});
    };

}
