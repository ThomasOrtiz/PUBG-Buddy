import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService,
    SqlRegionsService as sqlRegionsService,
    SqlModesService as sqlModesService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Seasons as SeasonEnum } from '../../enums/season.enum';
import { Server } from '../../models/server';
import { Player } from '../../models/player';


export class Rank extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'rank',
        description: 'Returns a players solo, duo, and squad ranking details.',
        usage: '<prefix>rank <pubg username> [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [mode=(fpp | tpp)]',
        examples: [
            '!pubg-rank john',
            '!pubg-rank john season=2018-03',
            '!pubg-rank john season=2018-03 region=eu',
            '!pubg-rank john season=2018-03 region=na mode=tpp',
            '!pubg-rank john region=as mode=tpp season=2018-03',
        ]
    };


    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }
        let username: string = params[0].toLowerCase();
        let serverDefaults: Server, season: string, region: string, mode: string;
        if (msg.guild) {
            serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            season = cs.getParamValue('season=', params, serverDefaults.default_season);
            region = cs.getParamValue('region=', params, serverDefaults.default_region);
            mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
        }
        else {
            season = cs.getParamValue('season=', params, await sqlSeasonsService.getLatestSeason());
            region = cs.getParamValue('region=', params, 'na');
            mode = cs.getParamValue('mode=', params, 'fpp');
        }
        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        if (!(await this.checkParameters(msg, season, region, mode))) {
            checkingParametersMsg.delete();
            return;
        }
        checkingParametersMsg.edit(`Getting data for ${username}`)
            .then(async (message: Discord.Message) => {
                const id: string = await pubgService.getCharacterID(username, region);
                if (!id) {
                    message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
                    return;
                }
                const soloData: Player = await pubgService.getPUBGCharacterData(id, username, season, region, 1, mode);
                const duoData: Player = await pubgService.getPUBGCharacterData(id, username, season, region, 2, mode);
                const squadData: Player = await pubgService.getPUBGCharacterData(id, username, season, region, 4, mode);
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
                    .setTitle('Ranking: ' + username)
                    .setDescription('Season:\t' + SeasonEnum[season] + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase())
                    .setColor(0x00AE86)
                    .setFooter(`https://pubg.op.gg/user/${username}?server=${region}`)
                    .setTimestamp();
                if (soloData) {
                    this.addEmbedFields(embed, 'Solo', soloData);
                }
                else {
                    embed.addBlankField(false);
                    embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
                }
                if (duoData) {
                    this.addEmbedFields(embed, 'Duo', duoData);
                }
                else {
                    embed.addBlankField(false);
                    embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
                }
                if (squadData) {
                    this.addEmbedFields(embed, 'Squad', squadData);
                }
                else {
                    embed.addBlankField(false);
                    embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
                }
                message.edit({ embed });
            });
    };


    addEmbedFields(embed: Discord.RichEmbed, squadType, playerData): void {
        embed.addBlankField(false)
            .addField(squadType + ' Rank / Rating / Top % / Grade', playerData.rank + ' / ' + playerData.rating + ' / ' + playerData.topPercent + ' / ' + playerData.grade, false)
            .addField('KD / KDA', playerData.kd + ' / ' + playerData.kda, true)
            .addField('Win %', playerData.winPercent, true)
            .addField('Top 10%', playerData.topTenPercent, true)
            .addField('Headshot Kill %', playerData.headshot_kills, true)
            .addField('Longest Kill', playerData.longest_kill, true)
            .addField('Average Damage', playerData.average_damage_dealt, true);
    }

    async checkParameters(msg: Discord.Message, checkSeason: string, checkRegion: string, checkMode: string): Promise<boolean> {
        let errMessage: string = '';
        let validSeason: boolean = await pubgService.isValidSeason(checkSeason);
        let validRegion: boolean = await pubgService.isValidRegion(checkRegion);
        let validMode: boolean = await pubgService.isValidMode(checkMode);
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
            errMessage += `Error:: Invalid season parameter\n${availableSeasons}\n`;
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
        if (!validSeason || !validRegion || !validMode) {
            cs.handleError(msg, errMessage, this.help);
            return false;
        }
        return true;
    }

}

