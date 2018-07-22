import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService,
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp, Player as User } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';


interface ParameterMap {
    amount: number;
    season: string;
    region: string;
    mode: string;
}

class PlayerWithSeasonData {
    constructor(name: string, gameModeStats: GameModeStats) {
        this.name = name;
        this.gameModeStats = gameModeStats;
    }

    readonly name: string;
    readonly gameModeStats: GameModeStats;
}

export class Top extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'top',
        description: 'Gets the top "x" players registered in the server',
        usage: '<prefix>top [Number-Of-Users] [season=] [region=] [mode=]',
        examples: [
            '!pubg-top',
            '!pubg-top season=2018-03',
            '!pubg-top season=2018-03 region=na',
            '!pubg-top season=2018-03 region=na',
            '!pubg-top season=2018-03 region=na mode=tpp',
            '!pubg-top 5',
            '!pubg-top 5 season=2018-03',
            '!pubg-top 5 season=2018-03 region=na',
            '!pubg-top 5 season=2018-03 region=na',
            '!pubg-top 5 season=2018-03 region=na mode=tpp'
        ]
    };

    async run(bot: any, msg: any, params: string[], perms: number) {
        const paramMap: ParameterMap = await this.getParameters(msg, params);

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, paramMap.season, paramMap.region, paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        let registeredUsers: User[] = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        if (registeredUsers.length === 0) {
            cs.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command', this.help);
            return;
        }

        checkingParametersMsg.edit(`Aggregating \`top ${paramMap.amount}\` on \`${registeredUsers.length} registered users\` ... give me a second`);

        msg.channel.send('Grabbing player data').then(async (msg: Discord.Message) => {
            const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[paramMap.region]);
            const statsToGetKey: string = this.getWhichStatsToGet(paramMap.mode);
            const batchEditAmount: number = 5;

            // Get list of ids
            const registeredNames: string[] = registeredUsers.map(user => user.username);
            const players: Player[] = await pubgApiService.getPlayerByName(api, registeredNames);

            // Iterate through players
            let userInfo: PlayerWithSeasonData[] = new Array();
            for(let i = 0; i < players.length; i++) {
                const player = players[i];
                const currentId = player.id;

                if (i % batchEditAmount === 0) {
                    let max: number = (i + batchEditAmount) > registeredUsers.length ? registeredUsers.length : i + batchEditAmount;
                    msg.edit(`Grabbing data for players ${i + 1} - ${max}`);
                }

                const seasonInfo: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(api, currentId, paramMap.season);
                const info = new PlayerWithSeasonData(player.name, seasonInfo[statsToGetKey]);
                userInfo.push(info);
            }

            // Sorting Array based off of ranking (higher ranking is better)
            userInfo.sort((a: PlayerWithSeasonData, b: PlayerWithSeasonData) => {
                const overallRatingB = pubgApiService.calculateOverallRating(b.gameModeStats.winPoints, b.gameModeStats.killPoints);
                const overallRatingA = pubgApiService.calculateOverallRating(a.gameModeStats.winPoints, a.gameModeStats.killPoints);
                return (+overallRatingB) - (+overallRatingA);
            });

            // Grab only the top 'x' players
            let topPlayers: PlayerWithSeasonData[] = userInfo.slice(0, paramMap.amount);

            // Construct top strings
            let names: string = '';
            let ratings: string = '';
            let kds: string = '';

            for (let i = 0; i < topPlayers.length; i++) {
                const playerInfo = topPlayers[i];
                const seasonStats: GameModeStats = playerInfo.gameModeStats;
                const overallRating = cs.round(pubgApiService.calculateOverallRating(seasonStats.winPoints, seasonStats.killPoints), 0);
                const kd = cs.round(seasonStats.kills / seasonStats.losses) || 0;
                const kda = cs.round((seasonStats.kills + seasonStats.assists) / seasonStats.losses) || 0;
                const averageDamageDealt = cs.round(seasonStats.damageDealt / seasonStats.roundsPlayed) || 0;
                const ratingStr: string = overallRating ? `${overallRating}` : 'Not available';
                const kdsStr: string    = `${kd} / ${kda} / ${averageDamageDealt}`;

                names += `${playerInfo.name}\n`;
                ratings += `${ratingStr}\n`;
                kds += `${kdsStr}\n`;
            }

            // Construct embed to send
            const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, paramMap.season);
            const regionDisplayName: string = paramMap.region.toUpperCase().replace('_', '-');
            const modeDescription: string = paramMap.mode.replace('_', '-');
            let embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle('Top ' + paramMap.amount + ' local players')
                .setDescription(`Season:\t ${seasonDisplayName}\nRegion:\t${regionDisplayName}\nMode:\t${modeDescription}`)
                .setColor(0x00AE86)
                .setFooter(`Using PUBG's official API`)
                .setTimestamp()
                .addField('Name', names, true)
                .addField('Rating', ratings, true)
                .addField('KD / KDA / Avg Dmg', kds, true);
            await msg.edit({ embed });
        });
    };

    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let amount: number = 10;
        if (params[0] && !isNaN(+params[0])) {
            amount = +params[0];
        }

        const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
        const paramMap: ParameterMap = {
            amount : amount,
            season: cs.getParamValue('season=', params, serverDefaults.default_season),
            region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
            mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_')
        }
        return paramMap;
    }

    /**
     *
     * @param {any} mode
     */
    private getWhichStatsToGet(mode: string): string {
        switch (mode) {
            case 'SOLO':
                return 'soloStats';
            case 'SOLO_FPP':
                return 'soloFPPStats';
            case 'DUO':
                return 'duoStats';
            case 'DUO_FPP':
                return 'duoFPPStats';
            case 'SQUAD':
                return 'squadStats';
            case 'SQUAD_FPP':
                return 'squadFPPStats';
        }
    }
}

