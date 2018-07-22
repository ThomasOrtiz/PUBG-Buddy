import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Seasons as SeasonEnum } from '../../enums/season.enum';
import { Server } from '../../models/server';

import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';


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
        usage: '<prefix>rank <pubg username> [season=] [region=] [mode=]',
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

        const username: string = params[0];
        let serverDefaults: Server, season: string, region: string, mode: string;
        if (msg.guild) {
            serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            season = cs.getParamValue('season=', params, serverDefaults.default_season);
            region = cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase();
            mode = cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase();
        }
        else {
            season = cs.getParamValue('season=', params, await sqlSeasonsService.getLatestSeason());
            region = cs.getParamValue('region=', params, 'pc-na').toUpperCase();
            mode = cs.getParamValue('mode=', params, 'fpp').toUpperCase();
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, season, region, mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for ${username}`);
        const api: PubgAPI      = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[region]);
        const players: Player[] = await pubgApiService.getPlayerByName(api, [username])
        const player: Player    = players[0];

        if (!player.id) {
            message.edit(`Could not find \`${username}\` on the \`${region}\` region. Double check the username and region.`);
            return;
        }

        // Get Player Data
        const seasonData: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(api, player.id, season);

        // Create embed to send
        const modeDescription = mode.indexOf('FPP') >= 0 ? 'FPP' : 'TPP';
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Ranking: ' + username)
            .setDescription(`Season:\t${SeasonEnum[season]}\nRegion:\t${region.toUpperCase()}\nMode: \t${modeDescription}`)
            .setColor(0x00AE86)
            .setFooter(`Using PUBG's official API`)
            .setTimestamp();

        if(mode.indexOf('FPP') >= 0) {
            this.addDataToEmbed(embed, seasonData.soloFPPStats, seasonData.duoFPPStats, seasonData.squadFPPStats);
        } else {
            this.addDataToEmbed(embed, seasonData.soloStats, seasonData.duoStats, seasonData.squadStats);
        }

        message.edit({ embed });
    };

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addDataToEmbed(embed: Discord.RichEmbed, soloData: GameModeStats, duoData: GameModeStats, squadData: GameModeStats) {
        if (soloData) {
            this.addEmbedFields(embed, 'Solo', soloData);
        } else {
            embed.addBlankField(false);
            embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
        }

        if (duoData) {
            this.addEmbedFields(embed, 'Duo', duoData);
        } else {
            embed.addBlankField(false);
            embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
        }

        if (squadData) {
            this.addEmbedFields(embed, 'Squad', squadData);
        } else {
            embed.addBlankField(false);
            embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
        }
    }

    /**
     * Add the game mode data to the enum
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private addEmbedFields(embed: Discord.RichEmbed, gameMode: string, playerData: GameModeStats): void {
        const overallRating = pubgApiService.calculateOverallRating(playerData.winPoints, playerData.killPoints);
        const kd = cs.round(playerData.kills / playerData.losses);
        const kda = cs.round((playerData.kills + playerData.assists) / playerData.losses);
        const winPercent = cs.getPercentFromFraction(playerData.wins, playerData.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(playerData.top10s, playerData.roundsPlayed);
        const headshotKills = cs.getPercentFromFraction(playerData.headshotKills, playerData.roundsPlayed);
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed);

        embed.addBlankField(false)
            .addField(`${gameMode} Rating`, cs.round(overallRating), false)
            .addField('KD / KDA', `${kd} / ${kda}`, true)
            .addField('Win %', winPercent, true)
            .addField('Top 10%', topTenPercent, true)
            .addField('Headshot Kill %', headshotKills, true)
            .addField('Longest Kill', cs.round(playerData.longestKill) + 'm', true)
            .addField('Average Damage', averageDamageDealt, true);
    }

}

