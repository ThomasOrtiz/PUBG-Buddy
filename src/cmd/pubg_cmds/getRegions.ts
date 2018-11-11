import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    PubgRegionService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';


export class GetRegions extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: ['getRegions'],
        permLevel: 0
    };
    help: CommandHelp = {
        name: 'regions',
        description: 'Returns all available regions to use as parameters',
        usage: '<prefix>regions',
        examples: [
            '!pubg-regions'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
        });

        let regions: string[] = PubgRegionService.getAvailableRegions();

        let regionStr: string = `= Regions =\n`;
        for (let i = 0; i < regions.length; i++) {
            regionStr += `${regions[i]}\n`;
        }

        msg.channel.send(regionStr, { code: 'asciidoc' });
    };
}
