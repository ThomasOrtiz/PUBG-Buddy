import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { SqlServerService as sqlServerService } from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { Server } from '../../models/server';


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
            '!pubg-setServerDefaults prefix=!pubg- season=2018-03 region=na mode=tpp',
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let prefix: string = cs.getParamValue('prefix=', params, false);
        let season: string = cs.getParamValue('season=', params, false);
        let region: string = cs.getParamValue('region=', params, false);
        let mode: string = cs.getParamValue('mode=', params, false);

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, season, region, mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        checkingParametersMsg.edit('Updating this server\'s defaults ...').then(async (msg: Discord.Message) => {
            sqlServerService.setServerDefaults(msg.guild.id, prefix, season, region, mode).then(async () => {
                let server: Server = await sqlServerService.getServerDefaults(msg.guild.id);
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
                    .setTitle('Server Defaults')
                    .setDescription('The defaults that a server has when running PUBG Bot commands.')
                    .setColor(0x00AE86)
                    .addField('Bot Prefix', server.default_bot_prefix, true)
                    .addBlankField(true)
                    .addBlankField(true)
                    .addBlankField(false)
                    .addField('Default Season', server.default_season, true)
                    .addField('Default Region', server.default_region, true)
                    .addField('Default GameMode', server.default_mode, true)
                msg.edit({ embed });
            });
        });
    };

}
