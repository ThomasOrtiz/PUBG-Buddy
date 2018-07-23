import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';

interface ParameterMap {
    username: string;
    season: string;
    region: string;
    mode: string;
}

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
        const paramMap: ParameterMap = await this.getParameters(msg, params);

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, paramMap.season, paramMap.region, paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for ${paramMap.username}`);
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[paramMap.region]);
        const players: Player[] = await pubgApiService.getPlayerByName(api, [paramMap.username])
        const player: Player = players[0];

        if (!player.id) {
            message.edit(`Could not find \`${paramMap.username}\` on the \`${paramMap.region}\` region. Double check the username and region.`);
            return;
        }

        // Get Player Data
        const seasonData: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(api, player.id, paramMap.season);

        // Create embed to send
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, paramMap.season);
        const regionDisplayName: string = paramMap.region.toUpperCase().replace('_', '-');
        const modeDescription: string = (paramMap.mode.indexOf('FPP') >= 0 ? 'FPP' : 'TPP').replace('_', '-');
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Ranking: ' + paramMap.username)
            .setDescription(`Season:\t${seasonDisplayName}\nRegion:\t${regionDisplayName}\nMode: \t${modeDescription}`)
            .setColor(0x00AE86)
            .setFooter(`Using PUBG's official API`)
            .setTimestamp();

        if(paramMap.mode.indexOf('FPP') >= 0) {
            this.addDataToEmbed(embed, seasonData.soloFPPStats, seasonData.duoFPPStats, seasonData.squadFPPStats);
        } else {
            this.addDataToEmbed(embed, seasonData.soloStats, seasonData.duoStats, seasonData.squadStats);
        }

        message.edit({ embed });
    };

    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }

        let paramMap: ParameterMap;
        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            paramMap = {
                username: params[0],
                season: cs.getParamValue('season=', params, serverDefaults.default_season),
                region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_'),
            }
        } else {
            paramMap = {
                username: params[0],
                season: cs.getParamValue('season=', params, await sqlSeasonsService.getLatestSeason()),
                region: cs.getParamValue('region=', params, 'pc_na').toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, 'solo_fpp').toUpperCase().replace('-', '_'),
            }
        }

        return paramMap;
    }

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
     * Add the game mode data to the embed
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private addEmbedFields(embed: Discord.RichEmbed, gameMode: string, playerData: GameModeStats): void {
        const overallRating = cs.round(pubgApiService.calculateOverallRating(playerData.winPoints, playerData.killPoints), 0) || 'NA';
        const kd = cs.round(playerData.kills / playerData.losses) || 0;
        const kda = cs.round((playerData.kills + playerData.assists) / playerData.losses) || 0;
        const winPercent = cs.getPercentFromFraction(playerData.wins, playerData.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(playerData.top10s, playerData.roundsPlayed);
        const headshotKills = cs.getPercentFromFraction(playerData.headshotKills, playerData.roundsPlayed);
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed) || 0;

        embed.addBlankField(false)
            .addField(`${gameMode} Rating`, overallRating, false)
            .addField('KD / KDA', `${kd} / ${kda}`, true)
            .addField('Win %', winPercent, true)
            .addField('Top 10%', topTenPercent, true)
            .addField('Headshot Kill %', headshotKills, true)
            .addField('Longest Kill', cs.round(playerData.longestKill) + 'm', true)
            .addField('Average Damage', averageDamageDealt, true);
    }

}

