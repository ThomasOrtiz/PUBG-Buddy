import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { SqlServerService as sqlServerService } from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp, Server } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';


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
        usage: '<prefix>setServerDefaults <prefix=> <season=> <region=> <mode=>',
        examples: [
            '!pubg-setServerDefaults prefix=!pubg- season=2018-03 region=pc-na mode=tpp',
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let prefix: string = cs.getParamValue('prefix=', params, '!pubg-');
        let season: string = cs.getParamValue('season=', params, false);
        let region: string = cs.getParamValue('region=', params, '').toUpperCase().replace('-', '_');
        let mode: string = cs.getParamValue('mode=', params, '').toUpperCase().replace('-', '_');

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, season, region, mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        checkingParametersMsg.edit('Updating this server\'s defaults ...').then(async (msg: Discord.Message) => {
            sqlServerService.setServerDefaults(msg.guild.id, prefix, season, region, mode).then(async () => {
                let server: Server = await sqlServerService.getServerDefaults(msg.guild.id);

                const regionDisplayName: string = server.default_region.replace('_', '-');
                const modeDescription: string = server.default_mode.replace('_', '-');
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
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
                msg.edit({ embed });
            });
        });
    };

}
