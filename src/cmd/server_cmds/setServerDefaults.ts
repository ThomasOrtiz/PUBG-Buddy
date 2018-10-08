import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    PubgService as pubgApiService,
    SqlServerService as sqlServerService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server } from '../../interfaces';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';

interface ParameterMap {
    prefix: string;
    season: string;
    region: string;
    mode: string;
}

export class SetServerDefaults extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 4
    };

    help: CommandHelp = {
        name: 'setServerDefaults',
        description: 'Set the server defaults for pubg commands. Only usable by users with administrator permissions.',
        usage: '<prefix>setServerDefaults [prefix=] [season=] [region=] [mode=]',
        examples: [
            '!pubg-setServerDefaults',
            '!pubg-setServerDefaults prefix=!pubg-',
            '!pubg-setServerDefaults prefix=!pubg- season=2018-08 ',
            '!pubg-setServerDefaults prefix=!pubg- season=2018-08 region=pc-na ',
            '!pubg-setServerDefaults prefix=!pubg- season=2018-08 region=pc-na mode=squad-fpp',
        ]
    };

    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if(params.length === 0) {
            const message: Discord.Message = await msg.channel.send('Getting server defaults ...') as Discord.Message;
            const embed: Discord.RichEmbed = await this.getCurrentServerDefaultsEmbed(message);
            message.edit({embed});
            return;
        }

        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) { return; }

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        checkingParametersMsg.edit('Updating this server\'s defaults ...').then(async (msg: Discord.Message) => {
            sqlServerService.setServerDefaults(msg.guild.id, this.paramMap.prefix, this.paramMap.season, this.paramMap.region, this.paramMap.mode).then(async () => {
                const embed: Discord.RichEmbed = await this.getCurrentServerDefaultsEmbed(msg);
                msg.edit({ embed });
            });
        });
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let paramMap: ParameterMap;

        const server: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const currentSeason: string = (await pubgApiService.getCurrentSeason(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA))).id.split('division.bro.official.')[1];

        paramMap = {
            prefix: cs.getParamValue('prefix=', params, server.default_bot_prefix || '!pubg-'),
            season: cs.getParamValue('season=', params, server.default_season || currentSeason),
            region: cs.getParamValue('region=', params, server.default_region || 'pc_na').toUpperCase().replace('-', '_'),
            mode: cs.getParamValue('mode=', params, server.default_mode || 'solo_fpp').toUpperCase().replace('-', '_'),
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            prefix: paramMap.prefix,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    private async getCurrentServerDefaultsEmbed(msg: Discord.Message): Promise<Discord.RichEmbed> {
        let server: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const regionDisplayName: string = server.default_region.replace('_', '-');
        const modeDescription: string = server.default_mode.replace('_', '-');

        return new Discord.RichEmbed()
            .setTitle('Server Defaults')
            .setDescription('The defaults that a server has when running PUBG Bot commands.')
            .setColor(0x00AE86)
            .addField('Bot Prefix', server.default_bot_prefix, true)
            .addBlankField(true)
            .addBlankField(true)
            .addBlankField(false)
            .addField('Default Season', server.default_season, true)
            .addField('Default Region', regionDisplayName, true)
            .addField('Default Mode', modeDescription, true)
    }
}
