import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
    CommonService as cs
} from '../../services';
import { PlatformRegion, PubgAPI, Season } from 'pubg-typescript-api';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


export class GetSeasons extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: ['getSeasons'],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'seasons',
        description: 'Returns all available seasons to use as parameters',
        usage: '<prefix>seasons',
        examples: [
            '!pubg-seasons'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        const pc_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.STEAM), true);
        const xbox_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.XBOX_NA), true);
        let pc_seasons_str: string = '';
        let xbox_seasons_str: string = '';

        for (let i = 0; i < pc_seasons.length; i++) {
            const seasonId: string = pc_seasons[i].id.split('division.bro.official.')[1];
            const isCurrent: boolean = pc_seasons[i].isCurrentSeason;
            pc_seasons_str += `${seasonId}${isCurrent ? ' (Current)' : ''}\n`;
        }

        for (let i = 0; i < xbox_seasons.length; i++) {
            const seasonId: string = xbox_seasons[i].id.split('division.bro.official.')[1];
            const isCurrent: boolean = xbox_seasons[i].isCurrentSeason;
            xbox_seasons_str += `${seasonId}${isCurrent ? ' (Current)' : ''}\n`;
        }

        const embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Seasons')
            .setDescription('The seasons for each platform')
            .setColor(0x00AE86)
            .addField('PC Seasons', pc_seasons_str, true)
            .addField('Xbox Seasons', xbox_seasons_str, true);

        msg.channel.send({embed});
    };
}
