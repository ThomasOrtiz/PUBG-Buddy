import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    PubgPlatformService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PlatformRegion } from '../../pubg-typescript-api';


export class GetRegions extends Command {

    conf: CommandConfiguration = {
        group: 'PUBG',
        enabled: true,
        guildOnly: false,
        aliases: ['getRegions'],
        permLevel: 0
    };
    help: CommandHelp = {
        name: 'regions',
        description: 'Returns all available regions',
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

        let regions: string[] = Object.values(PlatformRegion);
        let pc_regions_str: string = regions.filter(region => {
            region = region.toUpperCase().replace('-', '_');
            return PubgPlatformService.isPlatformPC(PlatformRegion[region]);
        }).join('\n');
        let xbox_regions_str: string = regions.filter(region => {
            region = region.toUpperCase().replace('-', '_');
            return PubgPlatformService.isPlatformXbox(PlatformRegion[region]);
        }).join('\n');

        const embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Regions')
            .setDescription('The regions for each platform')
            .setColor(0x00AE86)
            .addField('PC Regions', pc_regions_str, true)
            .addField('Xbox Regions', xbox_regions_str, true);

        msg.channel.send({embed});
    };
}
