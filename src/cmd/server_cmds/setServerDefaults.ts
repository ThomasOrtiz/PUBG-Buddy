import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService,
    SqlRegionsService as sqlRegionsService,
    SqlModesService as sqlModesService,
    SqlSqaudSizeService as sqlSqaudSizeService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
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
        usage: '<prefix>setServerDefaults <prefix=[prefix]> <season=(2018-01 | 2018-02 | 2018-03)> <region=(na | as | kr/jp | kakao | sa | eu | oc | sea)> <squadSize=(1 | 2 | 4)> <mode=(fpp | tpp)>',
        examples: [
            '!pubg-setServerDefaults prefix=!pubg- season=2018-03 region=na squadSize=4 mode=tpp',
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let prefix: string = cs.getParamValue('prefix=', params, false);
        let season: string = cs.getParamValue('season=', params, false);
        let region: string = cs.getParamValue('region=', params, false);
        let mode: string = cs.getParamValue('mode=', params, false);
        let squadSize: string = cs.getParamValue('squadSize=', params, false);
        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        if (!(await this.checkParameters(msg, prefix, season, region, mode, squadSize))) {
            checkingParametersMsg.delete();
            return;
        }
        checkingParametersMsg.edit('Updating this server\'s defaults ...')
            .then(async (msg: Discord.Message) => {
                sqlServerService.setServerDefaults(msg.guild.id, prefix, season, region, mode, +squadSize)
                    .then(async () => {
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
                            .addField('Default Mode', server.default_mode, true)
                            .addField('Default Squad Size', server.default_squadSize, true);
                        msg.edit({ embed });
                    });
            });
    };

    async checkParameters(msg: Discord.Message, prefix: string, checkSeason: string, checkRegion: string, checkMode: string, checkSquadSize: string): Promise<boolean> {
        if (!prefix || !checkSeason || !checkRegion || !checkMode || !checkSquadSize) {
            cs.handleError(msg, 'Error:: Must specify all parameters', this.help);
            return;
        }
        let errMessage: string = '';
        let validPrefix: boolean = prefix.length > 0;
        let validSeason: boolean = await pubgService.isValidSeason(checkSeason);
        let validRegion: boolean = await pubgService.isValidRegion(checkRegion);
        let validMode: boolean = await pubgService.isValidMode(checkMode);
        let validSquadSize: boolean = await pubgService.isValidSquadSize(checkSquadSize);
        if (!validSeason) {
            let seasons: any = await sqlSeasonsService.getAllSeasons();
            let availableSeasons: string = '== Available Seasons ==\n';
            for (let i = 0; i < seasons.length; i++) {
                if (i < seasons.length - 1) {
                    availableSeasons += seasons[i].season + ', ';
                }
                else {
                    availableSeasons += seasons[i].season;
                }
            }
            errMessage += `\nError:: Invalid season parameter\n${availableSeasons}\n`;
        }
        if (!validRegion) {
            let regions: any = await sqlRegionsService.getAllRegions();
            let availableRegions: string = '== Available Regions ==\n';
            for (let i = 0; i < regions.length; i++) {
                if (i < regions.length - 1) {
                    availableRegions += regions[i].shortname + ', ';
                }
                else {
                    availableRegions += regions[i].shortname;
                }
            }
            errMessage += `\nError:: Invalid region parameter\n${availableRegions}\n`;
        }
        if (!validMode) {
            let modes: any = await sqlModesService.getAllModes();
            let availableModes: string = '== Available Modes ==\n';
            for (let i = 0; i < modes.length; i++) {
                if (i < modes.length - 1) {
                    availableModes += modes[i].shortname + ', ';
                }
                else {
                    availableModes += modes[i].shortname;
                }
            }
            errMessage += `\nError:: Invalid mode parameter\n${availableModes}\n`;
        }
        if (!validSquadSize) {
            let squadSizes: any = await sqlSqaudSizeService.getAllSquadSizes();
            let availableSizes: string = '== Available Squad Sizes ==\n';
            for (let i = 0; i < squadSizes.length; i++) {
                if (i < squadSizes.length - 1) {
                    availableSizes += squadSizes[i].size + ', ';
                }
                else {
                    availableSizes += squadSizes[i].size;
                }
            }
            errMessage += `\nError:: Invalid squad size parameter\n${availableSizes}\n`;
        }
        if (!validPrefix || !validSeason || !validRegion || !validMode || !validSquadSize) {
            cs.handleError(msg, errMessage, this.help);
            return false;
        }
        return true;
    }

}
