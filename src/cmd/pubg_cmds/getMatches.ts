import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    ParameterService as parameterService,
    PubgPlatformService, PubgPlayerService, PubgValidationService,
    SqlServerService as sqlServerService,
    PubgMatchesService,
    PubgMapService
} from '../../services';
import { PubgAPI, PlatformRegion, Player, PlayerSeason, Match } from 'pubg-typescript-api';
import { PubgParameters } from '../../interfaces';
import { CommonMessages } from '../../shared/constants';


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
            '!pubg-matches Jane',
            '!pubg-matches Jane season=2018-03',
            '!pubg-matches Jane season=2018-03 region=pc-na',
            '!pubg-matches Jane season=2018-03 region=pc-na mode=solo-fpp',
        ]
    }

    private paramMap: ParameterMap;


    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        const reply: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await PubgValidationService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if (!isValidParameters) {
            reply.delete();
            return;
        }

        await reply.edit('Getting matches');
        const pubgPlayersApi: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const players: Player[] = await PubgPlayerService.getPlayerByName(pubgPlayersApi, [this.paramMap.username]);

        if (players.length === 0) {
            reply.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }

        const player: Player = players[0];
        let seasonData: PlayerSeason;
        try {
            const seasonStatsApi: PubgAPI = PubgPlatformService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);
            seasonData = await PubgPlayerService.getPlayerSeasonStatsById(seasonStatsApi, player.id, this.paramMap.season);
        } catch(e) {
            reply.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }

        // Create base embed to send
        let embed: Discord.RichEmbed = await this.createBaseEmbed();
        await this.addDefaultStats(embed, seasonData);

        this.setupReactions(reply, msg.author, seasonData);
        reply.edit(`**${msg.author.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, { embed });
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let paramMap: ParameterMap;

        let pubg_params: PubgParameters;
        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            pubg_params = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        } else {
            pubg_params = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true);
        }

        // Throw error if no username supplied
        if (!pubg_params.username) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username or register with `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            username: pubg_params.username,
            season: pubg_params.season,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
            mode: pubg_params.mode.toUpperCase().replace('-', '_'),
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: pubg_params.username,
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
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`Matches for ${this.paramMap.username}`)
            .setDescription(`Season:\t${this.paramMap.season}\nRegion:\t${regionDisplayName}`)
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
        const onOneCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 1`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            await this.addSpecificDataToEmbed(embed, seasonData.soloFPPMatchIds, 'Solo FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.soloMatchIds, 'Solo TPP');

            await msg.edit(warningMessage, { embed });
        };
        const onTwoCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 2`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            await this.addSpecificDataToEmbed(embed, seasonData.duoFPPMatchIds, 'Duo FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.duoMatchIds, 'Duo TPP');

            await msg.edit(warningMessage, { embed });
        };
        const onFourCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 4`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            const embed: Discord.RichEmbed = await this.createBaseEmbed();
            await this.addSpecificDataToEmbed(embed, seasonData.squadFPPMatchIds, 'Squad FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.squadMatchIds, 'Squad TPP');

            await msg.edit(warningMessage, { embed });
        };
        discordMessageService.setupReactions(msg, originalPoster, onOneCollect, onTwoCollect, onFourCollect);
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private async addDefaultStats(embed: Discord.RichEmbed, seasonData: PlayerSeason) {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            await this.addSpecificDataToEmbed(embed, seasonData.soloFPPMatchIds, 'Solo FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.soloMatchIds, 'Solo TPP');
        } else if (cs.stringContains(mode, 'duo', true)) {
            await this.addSpecificDataToEmbed(embed, seasonData.duoFPPMatchIds, 'Duo FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.duoMatchIds, 'Duo TPP');
        } else if (cs.stringContains(mode, 'squad', true)) {
            await this.addSpecificDataToEmbed(embed, seasonData.squadFPPMatchIds, 'Squad FPP');
            await this.addSpecificDataToEmbed(embed, seasonData.squadMatchIds, 'Squad TPP');
        }
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private async addSpecificDataToEmbed(embed: Discord.RichEmbed, matchIds: string[], type: string) {
        if (matchIds.length > 0) {
            await this.addEmbedFields(embed, type, matchIds);
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
    private async addEmbedFields(embed: Discord.RichEmbed, gameMode: string, matchIds: string[]) {
        let reply: string = '';
        const finalLength: number = matchIds.length <= this.MAX_MATCHES ? matchIds.length : this.MAX_MATCHES;

        const seasonStatsApi: PubgAPI = PubgPlatformService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);

        let matches: Match[] = [];
        for (let i = 0; i < finalLength; i++) {
            let match: Match = await PubgMatchesService.getMatchInfo(seasonStatsApi, matchIds[i]);
            matches.push(match);
        }

        for (let i = 0; i < finalLength; i++) {
            const match: Match = matches[i];
            const url: string = this.getPubgReplayUrl(this.paramMap.region, this.paramMap.username, match.id);

            const mapDisplay: string = PubgMapService.getMapDisplayName(match.map);
            const dateTime: string = match.dateCreated.toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' EST';

            reply += `[${mapDisplay} Match](${url}) at \`${dateTime}\`\n`
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
