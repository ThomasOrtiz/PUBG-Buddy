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
    amount: number;
    season: string;
    region: string;
    mode: string;
}

class PlayerWithSeasonData {
    constructor(name: string, seasonData: PlayerSeason) {
        this.name = name;
        this.seasonData = seasonData;
    }

    readonly name: string;
    readonly seasonData: PlayerSeason;
}

class PlayerWithGameModeStats {
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

    private paramMap: ParameterMap;
    private registeredUsers: User[];
    private api: PubgAPI;
    private batchEditAmount: number = 5;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const originalPoster: Discord.User = msg.author;
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

        checkingParametersMsg.edit(`Aggregating \`top ${this.paramMap.amount}\` on \`${this.registeredUsers.length} registered users\` ... give me a second`);

        msg.channel.send('Grabbing player data').then(async (msg: Discord.Message) => {
            this.api = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);

            // Get list of ids
            const registeredNames: string[] = this.registeredUsers.map(user => user.username);
            const players: Player[] = await this.getPlayerInfoByBatching(registeredNames);

            // Retrieve Season data for player
            let playerSeasons: PlayerWithSeasonData[] = await this.getPlayersSeasonData(msg, players);

            // Create base embed to send
            let embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addDefaultStats(embed, playerSeasons);

            // Send the message and setup reactions
            this.setupReactions(msg, originalPoster, playerSeasons);
            msg.edit({ embed });
        });
    };

    /**
     * Returns PUBG Player[] by batching
     * @param {string[]} names list of names
     * @returns {Promise<Player[]>}
     */
    private async getPlayerInfoByBatching(names: string[]): Promise<Player[]> {
        let players: Player[] = new Array<Player>();
        const batchAmount: number = 5;

        let currBatch: string[] = names.splice(0, batchAmount);
        while (currBatch.length > 0) {
            const batchedPlayers: Player[] = await pubgApiService.getPlayerByName(this.api, currBatch);
            players = [...players, ...batchedPlayers];

            currBatch = names.splice(0, batchAmount);
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
    private addDefaultStats(embed: Discord.RichEmbed, players: PlayerWithSeasonData[]): void {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            this.addSpecificDataToEmbed(embed, players, 'SOLO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SOLO');
        } else if (cs.stringContains(mode, 'duo', true)) {
            this.addSpecificDataToEmbed(embed, players, 'DUO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'DUO');
        } else if (cs.stringContains(mode, 'squad', true)) {
            this.addSpecificDataToEmbed(embed, players, 'SQUAD_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SQUAD');
        }
    }

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
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
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     * @param {PlayerSeason} seasonData
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User, players: PlayerWithSeasonData[]): Promise<void> {
        const reaction_numbers = ["\u0030\u20E3","\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"]
        await msg.react(reaction_numbers[1]);
        await msg.react(reaction_numbers[2]);
        await msg.react(reaction_numbers[4]);

        const one_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[1] && originalPoster.id === user.id;
        const two_filter: Discord.CollectorFilter = (reaction, user) =>  reaction.emoji.name === reaction_numbers[2] && originalPoster.id === user.id;
        const four_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[4] && originalPoster.id === user.id;

        const one_collector: Discord.ReactionCollector = msg.createReactionCollector(one_filter, { time: 15*1000 });
        const two_collector: Discord.ReactionCollector = msg.createReactionCollector(two_filter, { time: 15*1000 });
        const four_collector: Discord.ReactionCollector = msg.createReactionCollector(four_filter, { time: 15*1000 });

        one_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            mixpanel.track(`${this.help.name} - Click 1`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, players, 'SOLO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SOLO');

            await msg.edit(warningMessage, { embed });
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            mixpanel.track(`${this.help.name} - Click 2`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, players, 'DUO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'DUO');

            await msg.edit(warningMessage, { embed });
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            mixpanel.track(`${this.help.name} - Click 4`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, players, 'SQUAD_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SQUAD');

            await msg.edit(warningMessage, { embed });
        });

        one_collector.on('end', collected => msg.clearReactions());
        two_collector.on('end', collected => msg.clearReactions());
        four_collector.on('end', collected => msg.clearReactions());
    }

    /**
     * Creates the base embed that the command will respond with
     * @returns {Promise<Discord.RichEmbed} a new RichEmbed with the base information for the command
     */
    private async createBaseEmbed(): Promise<Discord.RichEmbed> {
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, this.paramMap.season);
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle('Top ' + this.paramMap.amount + ' local players')
                .setDescription(`Season:\t ${seasonDisplayName}\nRegion:\t${regionDisplayName}`)
                .setColor(0x00AE86)
                .setFooter(`Using PUBG's official API`)
                .setTimestamp()

        return embed;
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addSpecificDataToEmbed(embed: Discord.RichEmbed, players: PlayerWithSeasonData[], gameMode: string): void {
        this.addEmbedFields(embed, gameMode, players);
    }

    /**
     * Add the game mode data to the embed
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private async addEmbedFields(embed: Discord.RichEmbed, gameMode: string, players: PlayerWithSeasonData[]) {
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

        // Grab only the top 'x' players
        let topPlayers: PlayerWithGameModeStats[] = userInfo.slice(0, this.paramMap.amount);

        // Construct top strings
        let names: string = '';
        let ratings: string = '';
        let kds: string = '';

        for (let i = 0; i < topPlayers.length; i++) {
            const playerInfo = topPlayers[i];
            const seasonStats: GameModeStats = playerInfo.gameModeStats;

            if(seasonStats.roundsPlayed === 0) { continue; }

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

        const gameModeSplit: string[] = gameMode.split('_');
        let gameModeDescription: string = gameModeSplit[0];
        gameModeDescription += (gameModeSplit.length == 2) ? ` ${gameModeSplit[1]}` : '';

        if(names.length === 0) { return; }

        embed.addBlankField();
        embed.addField('Game Type', gameModeDescription);
        embed.addField('Name', names, true);
        embed.addField('Rating', ratings, true);
        embed.addField('KD / KDA / Avg Dmg', kds, true);
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

