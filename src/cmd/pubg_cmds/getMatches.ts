import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { CommonService as cs } from '../../services/common.service';
import {
    SqlServerService as sqlServerService,
    SqlUserRegisteryService as sqlUserRegisteryService
} from '../../services/sql-services';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { PubgAPI, PlatformRegion, Player, PlayerSeason } from 'pubg-typescript-api';
import { AnalyticsService as analyticsService } from '../../services/analytics.service';


interface ParameterMap {
    username: string;
    season: string;
    region: string;
    mode: string;
}

export class GetMatches extends Command {

    private MAX_MATCHES: number = 5;

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    }

    help: CommandHelp= {
        name: 'matches',
        description: `Returns the last ${this.MAX_MATCHES} matches for a player with links to https://pubg-replay.com`,
        usage: '<prefix>matches [pubg username] [season=] [region=] [mode=]',
        examples: [
            '!pubg-matches        (only valid if you have used the `register` command)',
            '!pubg-matches Jane'
        ]
    }

    private paramMap: ParameterMap;


    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        const api: PubgAPI = pubgApiService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);

        const players: Player[] = await pubgApiService.getPlayerByName(api, [this.paramMap.username]);

        if(players.length === 0) {
            msg.channel.send(`Could not find \`${this.paramMap.username}\` on the \`${this.paramMap.region}\` region. Double check the username and region.`);
            return;
        }

        const player: Player = players[0];

        let seasonData: PlayerSeason;
        try {
            seasonData = await pubgApiService.getPlayerSeasonStatsById(api, player.id, this.paramMap.season);
        } catch(e) {
            msg.edit(`Could not find \`${this.paramMap.username}\`'s \`${this.paramMap.season}\` stats.`);
            return;
        }

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
        let username: string;

        // Try to get username from user registery
        if(!params[0] || cs.stringContains(params[0], '=')) {
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
            const currentSeason: string = (await pubgApiService.getCurrentSeason(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA))).id.split('division.bro.official.')[1];
            paramMap = {
                username: username,
                season: cs.getParamValue('season=', params, currentSeason),
                region: cs.getParamValue('region=', params, 'pc_na').toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, 'solo_fpp').toUpperCase().replace('-', '_'),
            }
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
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
            analyticsService.track(`${this.help.name} - Click 1`, {
                pubg_name: this.paramMap.username,
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
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPMatchIds, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloMatchIds, 'Solo TPP');

            await msg.edit(warningMessage, { embed });
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            analyticsService.track(`${this.help.name} - Click 2`, {
                pubg_name: this.paramMap.username,
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
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPMatchIds, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoMatchIds, 'Duo TPP');

            await msg.edit(warningMessage, { embed });
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            analyticsService.track(`${this.help.name} - Click 4`, {
                pubg_name: this.paramMap.username,
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
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPMatchIds, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadMatchIds, 'Squad TPP');

            await msg.edit(warningMessage, { embed });
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
            embed.addField(`${type} Status`, `Player hasn't played ${type} games this season`, false);
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
