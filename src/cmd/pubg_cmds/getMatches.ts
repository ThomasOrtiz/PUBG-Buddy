import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService
} from '../../services/sql-services/sql.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, Player, PlayerSeason } from 'pubg-typescript-api';

interface ParameterMap {
    username: string;
    season: string;
    region: string;
    mode: string;
}

export class GetMatches extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    }

    help: CommandHelp= {
        name: 'matches',
        description: 'Returns the last 10 matches for a player with links to https://pubg-replay.com',
        usage: '<prefix>matches <pubg username> [season=] [region=] [mode=]',
        examples: [
            '!pubg-matches'
        ]
    }

    private paramMap: ParameterMap;
    private MAX_MATCHES: number = 5;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }

        this.paramMap = await this.getParameters(msg, params);

        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);

        const players: Player[] = await pubgApiService.getPlayerByName(api, [this.paramMap.username]);
        const player: Player = players[0];
        const seasonData = await pubgApiService.getPlayerSeasonStatsById(api, player.id, this.paramMap.season);

        // Create base embed to send
        let embed: Discord.RichEmbed = await this.createBaseEmbed();
        this.addDefaultStats(embed, seasonData);

        // Send the message and setup reactions
        let message: Discord.Message = await msg.channel.send('Getting matches') as Discord.Message;
        this.setupReactions(message, msg.author, seasonData);
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
     * Creates the base embed that the command will respond with
     * @returns {Promise<Discord.RichEmbed} a new RichEmbed with the base information for the command
     */
    private async createBaseEmbed(): Promise<Discord.RichEmbed> {
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, this.paramMap.season);
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Matches')
            .setDescription(`Season:\t${seasonDisplayName}\nRegion:\t${regionDisplayName}`)
            .setColor(0x00AE86)
            .setFooter(`Powered by https://pubg-replay.com`)
            .setTimestamp()

        return embed;
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
            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPMatchIds, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloMatchIds, 'Solo TPP');

            await msg.edit({ embed });
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPMatchIds, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoMatchIds, 'Duo TPP');

            await msg.edit({ embed });
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            await reaction.remove(originalPoster);

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPMatchIds, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadMatchIds, 'Squad TPP');

            await msg.edit({ embed });
        });

        one_collector.on('end', collected => msg.clearReactions());
        two_collector.on('end', collected => msg.clearReactions());
        four_collector.on('end', collected => msg.clearReactions());
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private addDefaultStats(embed: Discord.RichEmbed, seasonData: PlayerSeason): void {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPMatchIds, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloMatchIds, 'Solo TPP');
        } else if (cs.stringContains(mode, 'duo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPMatchIds, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoMatchIds, 'Duo TPP');
        } else if (cs.stringContains(mode, 'squad', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPMatchIds, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadMatchIds, 'Squad TPP');
        }
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addSpecificDataToEmbed(embed: Discord.RichEmbed, matchIds: string[], type: string): void {
        if (matchIds.length > 0) {
            this.addEmbedFields(embed, type, matchIds);
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
    private addEmbedFields(embed: Discord.RichEmbed, gameMode: string, matchIds: string[]): void {
        let reply: string = '';
        const finalLength: number = matchIds.length <= this.MAX_MATCHES ? matchIds.length : this.MAX_MATCHES;

        for(let i = 0; i < finalLength; i++) {
            const url = this.getPubgReplayUrl(this.paramMap.region, this.paramMap.username, matchIds[i]);

            reply += `[Match ${i+1}](${url})\n`
        }

        embed.addField(`${gameMode} Matches`, reply, true);
    }

    /**
     * Constructs a replay url
     * @param platFormRegion
     * @param username
     * @param matchId
     * @returns {string} Replay Url
     */
    private getPubgReplayUrl(platFormRegion: string, username: string, matchId: string): string {
        const split_region = platFormRegion.split('_');
        const platform: string = split_region[0];
        const region: string = split_region[1];
        return `https://pubg-replay.com/match/${platform}/${region}/${matchId}?highlight=${username}`
    }
}
