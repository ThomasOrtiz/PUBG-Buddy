import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    PubgSeasonService, PubgValidationService,
    SqlServerService as sqlServerService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server } from '../../interfaces';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';

interface ParameterMap {
    prefix: string;
    season: string;
    region: string;
    mode: string;
}

export class Setup extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: ['setServerDefaults', 'getServerDefaults'],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'setup',
        description: 'Gets or sets up the server defaults for pubg commands.',
        usage: '<prefix>setup [prefix=] [season=] [region=] [mode=]',
        examples: [
            '!pubg-setup',
            '!pubg-setup prefix=!pubg-',
            '!pubg-setup prefix=!pubg- season=2018-08 ',
            '!pubg-setup prefix=!pubg- season=2018-08 region=pc-na ',
            '!pubg-setup prefix=!pubg- season=2018-08 region=pc-na mode=squad-fpp',
        ]
    };

    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const hasAdminPermissions: boolean = msg.member ? msg.member.hasPermission('ADMINISTRATOR'): false;

        if (params.length === 0 || (!hasAdminPermissions && params.length > 0)) {
            const message: Discord.Message = await msg.channel.send('Getting server defaults ...') as Discord.Message;
            const embed: Discord.RichEmbed = await this.getCurrentServerDefaultsEmbed(message);

            const reply: string = (!hasAdminPermissions && params.length > 0) ? ':warning: Insufficent permissions to set bot defaults - ask an admin. :warning:' : '';
            message.edit(reply, {embed});
            return;
        }

        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) { return; }

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters: boolean = await PubgValidationService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if (!isValidParameters) {
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
        const server: Server = await sqlServerService.getServer(msg.guild.id);
        const currentSeason: string = (await PubgSeasonService.getCurrentSeason(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA))).id.split('division.bro.official.')[1];

        const paramMap: ParameterMap = {
            prefix: cs.getParamValue('prefix=', params, server.default_bot_prefix || '!pubg-').trim() || '!pubg-',
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
        let server: Server = await sqlServerService.getServer(msg.guild.id);
        const regionDisplayName: string = server.default_region.replace('_', '-');
        const modeDescription: string = server.default_mode.replace('_', '-');

        return new Discord.RichEmbed()
            .setTitle('Server Defaults')
            .setDescription('The defaults that a server has when running PUBG Bot commands.')
            .setThumbnail(msg.guild.iconURL)
            .setColor(0x00AE86)
            .addField('Default Bot Prefix', cs.getEnvironmentVariable('prefix'), true)
            .addField('Custom Bot Prefix', server.default_bot_prefix, true)
            .addBlankField(false)
            .addField('Default Season', server.default_season, true)
            .addField('Default Region', regionDisplayName, true)
            .addField('Default Mode', modeDescription, true)
    }
}
