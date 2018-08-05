import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlUserRegisteryService as sqlUserRegisteryService
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';
import * as mixpanel from '../../services/analytics.service';

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
        usage: '<prefix>rank [pubg username] [season=] [region=] [mode=]',
        examples: [
            '!pubg-rank        (only valid if you have already used the `register` command)',
            '!pubg-rank john',
            '!pubg-rank john season=2018-03',
            '!pubg-rank john season=2018-03 region=eu',
            '!pubg-rank john season=2018-03 region=na mode=tpp',
            '!pubg-rank john region=as mode=tpp season=2018-03',
        ]
    };

    private paramMap: ParameterMap;

    public async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const originalPoster: Discord.User = msg.author;

        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for ${this.paramMap.username}`);
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const players: Player[] = await pubgApiService.getPlayerByName(api, [this.paramMap.username]);
        const player: Player = players[0];

        if (!player.id) {
            message.edit(`Could not find \`${this.paramMap.username}\` on the \`${this.paramMap.region}\` region. Double check the username and region.`);
            return;
        }

        // Get Player Data
        const seasonData: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(api, player.id, this.paramMap.season);

        // Create base embed to send
        let embed: Discord.RichEmbed = await this.createBaseEmbed();
        this.addDefaultStats(embed, seasonData);

        // Send the message and setup reactions
        this.setupReactions(message, originalPoster, seasonData);
        message.edit({ embed });
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let paramMap: ParameterMap;
        let username: string;

        // Try to get username from user registery
        if(!params[0]) {
            username = await sqlUserRegisteryService.getRegisteredUser(msg.author.id);
        }

        // Check if user had registered name, if not check if supplied
        if(!username) {
            username = params[0];
        }

        // Throw error if no username supplied
        if(!username) {
            cs.handleError(msg, 'Error:: Must specify a username or register with `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            paramMap = {
                username: username,
                season: cs.getParamValue('season=', params, serverDefaults.default_season),
                region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_'),
            }
        } else {
            paramMap = {
                username: username,
                season: cs.getParamValue('season=', params, await pubgApiService.getCurrentSeason(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA))),
                region: cs.getParamValue('region=', params, 'pc_na').toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, 'solo_fpp').toUpperCase().replace('-', '_'),
            }
        }

        mixpanel.track(this.help.name, {
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: username,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private addDefaultStats(embed: Discord.RichEmbed, seasonData: PlayerSeason): void {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPStats, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloStats, 'Solo TPP');
        } else if (cs.stringContains(mode, 'duo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPStats, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoStats, 'Duo TPP');
        } else if (cs.stringContains(mode, 'squad', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPStats, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadStats, 'Squad TPP');
        }
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     * @param {PlayerSeason} seasonData
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User, seasonData: PlayerSeason): Promise<void> {
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
            mixpanel.track(this.help.name, {
                Action: 'Click 1',
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPStats, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloStats, 'Solo TPP');

            await msg.edit({ embed });
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            mixpanel.track(this.help.name, {
                Action: 'Click 2',
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPStats, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoStats, 'Duo TPP');

            await msg.edit({ embed });
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            mixpanel.track(this.help.name, {
                Action: 'Click 4',
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPStats, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadStats, 'Squad TPP');

            await msg.edit({ embed });
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
            .setTitle('Ranking: ' + this.paramMap.username)
            .setDescription(`Season:\t${seasonDisplayName}\nRegion:\t${regionDisplayName}`)
            .setColor(0x00AE86)
            .setFooter(`Using PUBG's official API`)
            .setTimestamp();

        return embed;
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addSpecificDataToEmbed(embed: Discord.RichEmbed, data: GameModeStats, type: string): void {
        if (data.roundsPlayed > 0) {
            this.addEmbedFields(embed, type, data);
        } else {
            embed.addBlankField(false);
            embed.addField(`${type} Status`, `Player hasn\'t played ${type} games this season`, false);
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
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed) || 0;

        let killStats: string = `
        \`KD:\` ${kd}
        \`KDA:\` ${kda}
        \`Kills:\` ${playerData.kills}
        \`Assists:\` ${playerData.assists}
        \`DBNOs:\` ${playerData.dBNOs}
        \`Suicides:\` ${playerData.suicides}
        \`Headshots:\` ${playerData.headshotKills}
        \`Longest kill:\` ${playerData.longestKill.toFixed(2)}
        \`Road kill:\` ${playerData.roadKills}
        `;

        let gameStats: string = `
        \`Total Damage Dealt:\` ${playerData.damageDealt.toFixed(2)}
        \`Average damage dealt:\` ${averageDamageDealt}
        \`Longest time survived:\` ${playerData.longestTimeSurvived.toFixed(2)}
        \`Walk distance:\` ${playerData.walkDistance.toFixed(2)}
        \`Ride distance:\` ${playerData.rideDistance.toFixed(2)}
        \`Vehicles Destroyed:\` ${playerData.vehicleDestroys}
        `;

        let winStats: string = `
        \`Win %:\` ${winPercent}
        \`Wins:\` ${playerData.wins}
        \`Top 10 %:\` ${topTenPercent}
        \`Top 10s:\`  ${playerData.top10s}
        \`Matches Player:\`  ${playerData.roundsPlayed}
        `;

        embed.addBlankField();
        embed.addField(`${gameMode} Rating`, overallRating, false)
        embed.addField('Kill stats', killStats, true);
        embed.addField('Game stats', gameStats, true);
        embed.addField('Win stats', winStats);
    }

}

