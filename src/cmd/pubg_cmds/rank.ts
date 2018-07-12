import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService,
    SqlRegionsService as sqlRegionsService,
    SqlModesService as sqlModesService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Seasons as SeasonEnum } from '../../enums/season.enum';
import { Server } from '../../models/server';

import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from '../../../node_modules/pubg-typescript-api';


export class Rank extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'rank',
        description: 'Returns a players solo, duo, and squad ranking details. Username IS case sensitive.',
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

        let username: string = params[0];
        let serverDefaults: Server, season: string, region: string, mode: string;
        if (msg.guild) {
            serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            season = cs.getParamValue('season=', params, serverDefaults.default_season);
            region = cs.getParamValue('region=', params, serverDefaults.default_region);
            mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
        }
        else {
            season = cs.getParamValue('season=', params, await sqlSeasonsService.getLatestSeason());
            region = cs.getParamValue('region=', params, 'pc-na');
            mode = cs.getParamValue('mode=', params, 'fpp');
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const pubg_region: string = pubgApiService.getPubgRegionFromInput(region);
        // if (!(await this.checkParameters(msg, season, region, mode))) {
        //     checkingParametersMsg.delete();
        //     return;
        // }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for ${username}`);
        const api: PubgAPI      = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[pubg_region]);
        const players: Player[] = await pubgApiService.getPlayerByName(api, [username])
        const player: Player    = players[0];

        if (!player.id) {
            message.edit(`Could not find \`${username}\` on the \`${region}\` region. Double check the username and region.`);
            return;
        }

        // Get Player Data
        const seasonData: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(api, player.id, season);

        // Create embed to send
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Ranking: ' + username)
            .setDescription('Season:\t' + SeasonEnum[season] + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase())
            .setColor(0x00AE86)
            .setFooter(`Using PUBG's official API`)
            .setTimestamp();

        if(mode === 'fpp') {
            this.addFppDataToEmbed(embed, seasonData);
        } else {
            this.addDataToEmbed(embed, seasonData);
        }

        message.edit({ embed });
    };

    addFppDataToEmbed(embed: Discord.RichEmbed, seasonData: PlayerSeason) {
        if (seasonData.soloFPPStats) {
            this.addEmbedFields(embed, 'Solo', seasonData.soloFPPStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
        }

        if (seasonData.duoFPPStats) {
            this.addEmbedFields(embed, 'Duo', seasonData.duoFPPStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
        }

        if (seasonData.squadFPPStats) {
            this.addEmbedFields(embed, 'Squad', seasonData.squadFPPStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
        }
    }

    addDataToEmbed(embed: Discord.RichEmbed, seasonData: PlayerSeason) {
        if (seasonData.soloStats) {
            this.addEmbedFields(embed, 'Solo', seasonData.soloStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
        }

        if (seasonData.duoStats) {
            this.addEmbedFields(embed, 'Duo', seasonData.duoStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
        }

        if (seasonData.squadStats) {
            this.addEmbedFields(embed, 'Squad', seasonData.squadStats);
        } else {
            embed.addBlankField(false);
            embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
        }
    }

    addEmbedFields(embed: Discord.RichEmbed, squadType, playerData: GameModeStats): void {
        const overallRating = pubgApiService.calculateOverallRating(playerData.winPoints, playerData.killPoints);
        const kd = cs.round(playerData.kills / playerData.losses);
        const kda = cs.round((playerData.kills + playerData.assists) / playerData.losses);
        const winPercent = cs.getPercentFromFraction(playerData.wins, playerData.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(playerData.top10s, playerData.roundsPlayed);
        const headshotKills = cs.getPercentFromFraction(playerData.headshotKills, playerData.roundsPlayed);
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed);

        embed.addBlankField(false)
            .addField(`${squadType} Rating`, cs.round(overallRating), false)
            .addField('KD / KDA', `${kd} / ${kda}`, true)
            .addField('Win %', winPercent, true)
            .addField('Top 10%', topTenPercent, true)
            .addField('Headshot Kill %', headshotKills, true)
            .addField('Longest Kill', cs.round(playerData.longestKill) + 'm', true)
            .addField('Average Damage', averageDamageDealt, true);
    }

    async checkParameters(msg: Discord.Message, checkSeason: string, checkRegion: string, checkMode: string): Promise<boolean> {
        let errMessage: string   = '';
        let validSeason: boolean = await pubgApiService.isValidSeason(checkSeason);
        let validRegion: boolean = await pubgApiService.isValidRegion(checkRegion);
        let validMode: boolean   = await pubgApiService.isValidMode(checkMode);

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

