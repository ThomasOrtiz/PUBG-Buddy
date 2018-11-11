import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    PubgPlatformService, PubgValidationService,
    SqlServerService as sqlServerService
} from '../../services';
import { PlatformRegion, PubgAPI, Season } from 'pubg-typescript-api';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


interface ParameterMap {
    region: string;
}

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
        usage: '<prefix>seasons [region=]',
        examples: [
            '!pubg-seasons',
            '!pubg-seasons region=xbox-na'
        ]
    };

    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await PubgValidationService.isValidRegion(this.paramMap.region);
        if (!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            region: this.paramMap.region
        });

        let seasons: Season[] = await PubgSeasonService.getAvailableSeasons(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]), true);

        const platform = PubgPlatformService.isPlatformPC(PlatformRegion[this.paramMap.region]) ? 'PC' : 'Xbox';
        let seasonStr: string = `= ${platform}'s Seasons =\n`;

        for (let i = 0; i < seasons.length; i++) {
            const seasonId = seasons[i].id.split('division.bro.official.')[1];
            seasonStr += `${seasonId}\n`;
        }

        msg.channel.send(seasonStr, { code: 'asciidoc' });
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let paramMap: ParameterMap;

        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            paramMap = {
                region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
            }
        } else {
            paramMap = {
                region: cs.getParamValue('region=', params, 'pc_na').toUpperCase().replace('-', '_'),
            }
        }

        return paramMap;
    }
}
