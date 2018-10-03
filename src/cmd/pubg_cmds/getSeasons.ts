import { CommonService as cs } from '../../services/common.service';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import { PlatformRegion, PubgAPI, Season } from 'pubg-typescript-api';
import { AnalyticsService as analyticsService } from '../../services/analytics.service';


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
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length
        });

        let seasons: Season[] = await pubgService.getAvailableSeasons(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA), true);

        let seasonStr: string = `= Seasons =\n`;
        for (let i = 0; i < seasons.length; i++) {
            const seasonId = seasons[i].id.split('division.bro.official.')[1];
            seasonStr += `${seasonId}\n`;
        }

        msg.channel.send(seasonStr, { code: 'asciidoc' });
    };
}
