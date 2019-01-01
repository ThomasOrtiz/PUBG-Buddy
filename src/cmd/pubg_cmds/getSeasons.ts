import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { AnalyticsService, PubgPlatformService } from '../../services';
import { PlatformRegion, Season } from '../../pubg-typescript-api';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


export class GetSeasons extends Command {

    conf: CommandConfiguration = {
        group: 'PUBG',
        enabled: true,
        guildOnly: false,
        aliases: ['getSeasons'],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'seasons',
        description: 'Returns all available seasons',
        usage: '<prefix>seasons',
        examples: [
            '!pubg-seasons'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        const pc_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(PubgPlatformService.getApi(PlatformRegion.STEAM));
        const xbox_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(PubgPlatformService.getApi(PlatformRegion.XBOX));
        const psn_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(PubgPlatformService.getApi(PlatformRegion.PSN));

        let pc_seasons_str: string = '';
        let xbox_seasons_str: string = '';
        let psn_seasons_str: string = '';

        for (let season of pc_seasons) {
            const seasonId: string = PubgSeasonService.getSeasonDisplayName(season);
            const isCurrent: boolean = season.isCurrentSeason;
            pc_seasons_str += `${seasonId}${isCurrent ? ' (Current)' : ''}\n`;
        }

        for (let season of xbox_seasons) {
            const seasonId: string = PubgSeasonService.getSeasonDisplayName(season);
            const isCurrent: boolean = season.isCurrentSeason;
            xbox_seasons_str += `${seasonId}${isCurrent ? ' (Current)' : ''}\n`;
        }

        for (let season of psn_seasons) {
            const seasonId: string = PubgSeasonService.getSeasonDisplayName(season);
            const isCurrent: boolean = season.isCurrentSeason;
            psn_seasons_str += `${seasonId}${isCurrent ? ' (Current)' : ''}\n`;
        }

        const embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Seasons')
            .setDescription('The seasons for each platform.\n\n**"lifetime"** is only available for PC and only applies to seasons after **"pc-2018-01"**.')
            .setColor('F2A900')
            .addField('PC Seasons', pc_seasons_str, true)
            .addField('Xbox Seasons', xbox_seasons_str, true)
            .addField('PSN Seasons', psn_seasons_str, true);

        msg.channel.send({embed});
    };

}
