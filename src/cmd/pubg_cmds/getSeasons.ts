import { CommonService as cs } from '../../services/common.service';
import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import { PlatformRegion, PubgAPI, Season } from 'pubg-typescript-api';


export class GetSeasons extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'getSeasons',
        description: 'Returns all available seasons to use as parameters',
        usage: '<prefix>getSeasons',
        examples: [
            '!pubg-getSeasons'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let seasons: Season[] = await pubgService.getAvailableSeasons(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA), true);

        let seasonStr: string = `= Seasons =\n`;
        for (let i = 0; i < seasons.length; i++) {
            const seasonId = seasons[i].id.split('division.bro.official.')[1];
            seasonStr += `${seasonId}\n`;
        }

        msg.channel.send(seasonStr, { code: 'asciidoc' });
    };
}
