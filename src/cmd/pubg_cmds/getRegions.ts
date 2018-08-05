import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';


export class GetRegions extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };
    help: CommandHelp = {
        name: 'getRegions',
        description: 'Returns all available regions to use as parameters',
        usage: '<prefix>getRegions',
        examples: [
            '!pubg-getRegions'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let regions: string[] = pubgApiService.getAvailableRegions();

        let regionStr: string = `= Regions =\n`;
        for (let i = 0; i < regions.length; i++) {
            regionStr += `${regions[i]}\n`;
        }

        msg.channel.send(regionStr, { code: 'asciidoc' });
    };
}
