import { CommonService as cs } from '../../services/common.service';
import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { SqlSeasonsService as sqlSeasonsService } from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import { PlatformRegion, PubgAPI } from '../../../node_modules/pubg-typescript-api';


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
        let seasons: any = await sqlSeasonsService.getAllSeasons();

        const API_KEY = cs.getEnvironmentVariable('pubg_api_key');
        seasons = await pubgService.getAvailableSeasons(new PubgAPI(API_KEY, PlatformRegion.PC_NA));

        let seasonStr: string = `= Seasons =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(10)}: = Value =\n`;
        for (let i = 0; i < seasons.length; i++) {
            let key: string = seasons[i].name;
            let value: string = seasons[i].season;
            seasonStr += `${key.padEnd(10)}: ${value}\n`;
        }
        msg.channel.send(seasonStr, { code: 'asciidoc' });
    };
}
