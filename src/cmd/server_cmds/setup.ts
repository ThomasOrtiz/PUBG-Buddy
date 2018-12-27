import * as Discord from 'discord.js';
import {
    AnalyticsService,
    CommonService,
    PubgValidationService,
    SqlServerService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { IServer } from '../../interfaces';

interface ParameterMap {
    prefix: string;
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
        usage: '<prefix>setup [prefix=] [region=] [mode=]',
        examples: [
            '!pubg-setup',
            '!pubg-setup prefix=!pubg-',
            '!pubg-setup prefix=!pubg-',
            '!pubg-setup prefix=!pubg- region=pc-na ',
            '!pubg-setup prefix=!pubg- region=pc-na mode=squad-fpp',
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
        const isValidParameters: boolean = await PubgValidationService.validateParameters(msg, this.help, undefined, this.paramMap.region, this.paramMap.mode, false);
        if (!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        checkingParametersMsg.edit('Updating this server\'s defaults ...').then(async (msg: Discord.Message) => {
            SqlServerService.setServerDefaults(msg.guild.id, this.paramMap.prefix, this.paramMap.region, this.paramMap.mode).then(async () => {
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
        const server: IServer = await SqlServerService.getServer(msg.guild.id);

        const paramMap: ParameterMap = {
            prefix: CommonService.getParamValue('prefix=', params, server.default_bot_prefix || '!pubg-').trim() || '!pubg-',
            region: CommonService.getParamValue('region=', params, server.default_region || 'pc_na').toUpperCase().replace('-', '_'),
            mode: CommonService.getParamValue('mode=', params, server.default_mode || 'solo_fpp').toUpperCase().replace('-', '_'),
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            prefix: paramMap.prefix,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    private async getCurrentServerDefaultsEmbed(msg: Discord.Message): Promise<Discord.RichEmbed> {
        let server: IServer = await SqlServerService.getServer(msg.guild.id);
        const regionDisplayName: string = server.default_region.replace('_', '-');
        const modeDescription: string = server.default_mode.replace('_', '-');

        return new Discord.RichEmbed()
            .setTitle('Server Defaults')
            .setDescription('The defaults that a server has when running PUBG Bot commands.')
            .setThumbnail(msg.guild.iconURL)
            .setColor('F2A900')
            .addField('Default Bot Prefix', CommonService.getEnvironmentVariable('prefix'), true)
            .addField('Custom Bot Prefix', server.default_bot_prefix, true)
            .addBlankField(false)
            .addField('Default Region', regionDisplayName, true)
            .addField('Default Mode', modeDescription, true)
    }
}
