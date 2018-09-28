import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService,
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp, Player as User } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';


interface ParameterMap {
    season: string;
    region: string;
    mode: string;
}

class PlayerWithDiscordId {

    constructor(discordId: string, player: Player) {
        this.discordId = discordId;
        this.player = player;
    }

    readonly discordId: string;
    readonly player: Player;
}

class PlayerWithSeasonData {
    constructor(discordId: string, name: string, seasonData: PlayerSeason) {
        this.discordId = discordId;
        this.name = name;
        this.seasonData = seasonData;
    }

    readonly discordId: string;
    readonly name: string;
    readonly seasonData: PlayerSeason;
}

class PlayerWithGameModeStats {
    constructor(discordId: string, name: string, gameModeStats: GameModeStats) {
        this.discordId = discordId;
        this.name = name;
        this.gameModeStats = gameModeStats;
    }

    readonly discordId: string;
    readonly name: string;
    readonly gameModeStats: GameModeStats;
}

export class UpdateRoles extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [''],
        permLevel: 4
    };

    help: CommandHelp = {
        name: 'updateRoles',
        description: '',
        usage: '<prefix>updateRoles',
        examples: []
    };

    private paramMap: ParameterMap;
    private registeredUsers: User[];
    private api: PubgAPI;
    private batchEditAmount: number = 5;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        await this.ensureRolesExist(msg.guild);

        const sortedPlayers: PlayerWithSeasonData[] = await this.getLeaderBoardInfo(msg, params);

        await this.updateRoles(msg, sortedPlayers);
    };

    private async ensureRolesExist(guild: Discord.Guild) {
        const roles: Discord.RoleData[] = [
            {
                name: 'PUBG-Bronze',
                color: 'DARK_ORANGE',
                mentionable: true
            },
            {
                name: 'PUBG-Gold',
                color: 'GOLD',
                mentionable: true
            },
            {
                name: 'PUBG-Diamond',
                color: 'BLUE',
                mentionable: true
            },
            {
                name: 'PUBG-Master',
                color: 'DARK_PURPLE',
                mentionable: true
            },
            {
                name: 'PUBG-Chicken-Winner',
                color: 'ff0055',
                mentionable: true
            }
        ];

        const existingRoles: Discord.Collection<string, Discord.Role> = guild.roles;
        roles.forEach(async (role) => {
            const roleAlreadyExists: boolean = existingRoles.exists('name', role.name);
            if (!roleAlreadyExists) {
                await guild.createRole(role)
                    .then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
                    .catch(console.error);
            };

        });

    }

    private async getLeaderBoardInfo(msg: Discord.Message, params: string[]): Promise<PlayerWithSeasonData[]> {
        this.paramMap = await this.getParameters(msg, params);

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        this.registeredUsers = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        if (this.registeredUsers.length === 0) {
            cs.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command', this.help);
            return;
        }

        await checkingParametersMsg.edit(`Aggregating info on \`${this.registeredUsers.length} registered users\` ... give me a second`);

        await msg.channel.send('Grabbing player data').then(async (msg: Discord.Message) => {
            this.api = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);

            const players: Player[] = await this.getPlayerInfoByBatching(this.registeredUsers);

            // Retrieve Season data for player
            let playerSeasons: PlayerWithSeasonData[] = await this.getPlayersSeasonData(msg, players);

            return this.getSortedPlayerData(playerSeasons);
        });
    }

    private async updateRoles(msg: Discord.Message, sortedPlayers: PlayerWithSeasonData[]) {
        await msg.channel.send('Updating roles ...');

        // TODO: How do I map discord id?

    }

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
        const paramMap: ParameterMap = {
            season: cs.getParamValue('season=', params, serverDefaults.default_season),
            region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
            mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_')
        }

        mixpanel.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    /**
     * Returns PUBG Player[] by batching
     * @param {string[]} names list of names
     * @returns {Promise<Player[]>}
     */
    private async getPlayerInfoByBatching(registeredUsers: User[]): Promise<Player[]> {
        let players: Player[] = new Array<Player>();
        const batchAmount: number = 5;

        let currBatch: User[] = registeredUsers.splice(0, batchAmount);
        while (currBatch.length > 0) {
            const currNameBatch: string[] = currBatch.map(user => user.username);
            const batchedPlayers: Player[] = await pubgApiService.getPlayerByName(this.api, currNameBatch);


            // TODO: Need to combine username/discord_id
            players = [...players, ...batchedPlayers];

            currBatch = registeredUsers.splice(0, batchAmount);
        }

        return players;
    }

    /**
     * Returns a promise of PlayerWithSeasonData[]
     * @param {Discord.Message} msg
     * @param {Player[]} players list of PUBG Players
     * @returns {Promise<PlayerWithSeasonData[]>}
     */
    private async getPlayersSeasonData(msg: Discord.Message, players: Player[]): Promise<PlayerWithSeasonData[]> {
        let playerSeasons: PlayerWithSeasonData[] = new Array();

        for(let i = 0; i < players.length; i++) {
            const player = players[i];
            const currentId = player.id;

            if (i % this.batchEditAmount === 0) {
                let max: number = ((i + this.batchEditAmount) > this.registeredUsers.length) ? this.registeredUsers.length : i + this.batchEditAmount;
                msg.edit(`Grabbing data for players ${i + 1} - ${max}`);
            }

            try {
                const seasonInfo: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(this.api, currentId, this.paramMap.season);
                const info = new PlayerWithSeasonData(player.name, seasonInfo);
                playerSeasons.push(info);
            } catch(e) {
                // player hasn't played this season
            }

        }

        return playerSeasons;
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private getSortedPlayerData(players: PlayerWithSeasonData[]): PlayerWithGameModeStats[] {
        let mode = this.paramMap.mode;

        const isFpp = cs.stringContains(mode, 'fpp', true);
        if (isFpp) {
            if (cs.stringContains(mode, 'solo', true)) {
                return this.sortPlayerByRating(players, 'SOLO_FPP');
            } else if (cs.stringContains(mode, 'duo', true)) {
                return this.sortPlayerByRating(players, 'DUO_FPP');
            } else if (cs.stringContains(mode, 'squad', true)) {
                return this.sortPlayerByRating(players, 'SQUAD_FPP');
            }
        } else {
            if (cs.stringContains(mode, 'solo', true)) {
                return this.sortPlayerByRating(players, 'SOLO');
            } else if (cs.stringContains(mode, 'duo', true)) {
                return this.sortPlayerByRating(players, 'DUO');
            } else if (cs.stringContains(mode, 'squad', true)) {
                return this.sortPlayerByRating(players, 'SQUAD');
            }
        }
    }

    /**
     * Add the game mode data to the embed
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private sortPlayerByRating(players: PlayerWithSeasonData[], gameMode: string): PlayerWithGameModeStats[] {
        const statsToGetKey: string = this.getWhichStatsToGet(gameMode);

        // Create UserInfo array with specific season data
        let userInfo: PlayerWithGameModeStats[] = new Array();
        for(let i = 0; i < players.length; i++) {
            const data: PlayerWithSeasonData = players[i];
            const info = new PlayerWithGameModeStats(data.name, data.seasonData[statsToGetKey]);
            userInfo.push(info);
        }

        // Sorting Array based off of ranking (higher ranking is better)
        userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
            const overallRatingB = pubgApiService.calculateOverallRating(b.gameModeStats.winPoints, b.gameModeStats.killPoints);
            const overallRatingA = pubgApiService.calculateOverallRating(a.gameModeStats.winPoints, a.gameModeStats.killPoints);
            return (+overallRatingB) - (+overallRatingA);
        });

        return userInfo;
    }

    /**
     * Give a mode, return the dict key relevant to that mode
     * @param {string} mode
     * @returns {string} dictionary key for stat to get
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
