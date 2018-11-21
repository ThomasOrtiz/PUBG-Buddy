import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgParameters } from '../../interfaces';
import {
    CommonService, SqlServerService, ParameterService, DiscordMessageService, AnalyticsService,
    PubgPlayerService, PubgValidationService, PubgMatchesService, PubgMapService, PubgPlatformService
} from '../../services';
import { PubgAPI, PlatformRegion, Player, Match, Roster, Participant } from '../../pubg-typescript-api';

interface ParameterMap {
    username: string;
    season: string;
    region: string;
    mode: string;
}


export class LastMatch extends Command {

    conf: CommandConfiguration = {
        group: 'PUBG',
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0,
    }

    help: CommandHelp = {
        name: 'lastMatch',
        description: 'Returns a match summary of the last match. **Name is case sensitive**',
        usage: '<prefix>lastMatch [pubg username] [season=] [region=]',
        examples: [
            '!pubg-lastMatch        (only valid if you have used the `register` command)',
            '!pubg-lastMatch john',
            '!pubg-lastMatch "Player A"',
            '!pubg-lastMatch john season=pc-2018-01',
            '!pubg-lastMatch john season=pc-2018-01 region=pc-eu',
        ]
    }
    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {

        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch (e) {
            return;
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await PubgValidationService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if (!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }
        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for **${this.paramMap.username}**`);

        const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[this.paramMap.region]);
        const players: Player[] = await PubgPlayerService.getPlayersByName(api, [this.paramMap.username]);
        if (players.length === 0) {
            message.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }
        const player: Player = players[0];
        if (!player.id) {
            message.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }

        const lastMatchId: string = player.matchIds[0];
        const match: Match = await PubgMatchesService.getMatchInfo(new PubgAPI(CommonService.getEnvironmentVariable('pubg_api_key'), PlatformRegion.STEAM), lastMatchId);

        const embed: Discord.RichEmbed = await this.createEmbed(match);
        msg.channel.send(embed);
    }

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
            const serverDefaults = await SqlServerService.getServer(msg.guild.id);
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        } else {
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true);
        }

        // Throw error if no username supplied
        if (!pubg_params.username) {
            DiscordMessageService.handleError(msg, 'Error:: Must specify a username or register with `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            username: pubg_params.username,
            season: pubg_params.season,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
            mode: pubg_params.mode.toUpperCase().replace('-', '_')
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: paramMap.username,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    /**
     * Creates the embed that the command will respond with
     * @returns {Promise<Discord.RichEmbed} a new RichEmbed with the base information for the command
     */
    private async createEmbed(match: Match): Promise<Discord.RichEmbed> {
        const roster: Roster = match.rosters.filter(roster => roster.participants.filter(p => p.name === this.paramMap.username)[0])[0];
        const teamParticipanets = roster.participants;

        for (let i = 0; i < teamParticipanets.length; i++) {
            const p = teamParticipanets[i];
            if (p.name === this.paramMap.username) {
                teamParticipanets.unshift(teamParticipanets.splice(i, 1)[0]);
            }
        }

        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`PUBG Match Summary - ${regionDisplayName} (${this.paramMap.season})`)
            .setDescription(CommonService.multiLineStringNoLeadingWhitespace`
                **Started at**: ${match.dateCreated.toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' EST'}
                **Map**: ${PubgMapService.getMapDisplayName(match.map)}
                **Length**: ${this.secondsToHms(match.duration)}
                **Placement**: ${roster.rank}
                **Replay Link**: [Link](${this.getPubgReplayUrl(this.paramMap.region, this.paramMap.username, match.id)})`)
            .setColor('F2A900');

        for (let i = 0; i < teamParticipanets.length; i++) {
            const participant: Participant = teamParticipanets[i];

            embed.addField('=================================', `**${participant.name}**'s Match Stats`);
            const killStats: string = CommonService.multiLineStringNoLeadingWhitespace`
                **Kills**: ${participant.kills}
                **Assists**: ${participant.assists}
                **Damage**: ${participant.damageDealt.toFixed(2)}
                **Headshot Kills**:  ${participant.headshotKills}
                **Longest Kill**: ${participant.longestKill.toFixed(2)}
                **Road Kills**: ${participant.roadKills}
                **Team Kills**: ${participant.teamKills}`;

            const gameStats: string = CommonService.multiLineStringNoLeadingWhitespace`
                **Survived For**: ${this.secondsToHms(participant.timeSurvived)}
                **Revives**: ${participant.revives}
                **Walk Distance**: ${participant.walkDistance.toFixed(2)}m
                **Car Distance**: ${participant.rideDistance.toFixed(2)}m`;

            embed.addField('Kill Stats', killStats, true);
            embed.addField('Game Stats', gameStats, true);
        }

        return embed;
    }

    private secondsToHms(d) {
        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return hDisplay + mDisplay + sDisplay;
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
        username = username.replace(' ', '%20');
        return `https://pubg-replay.com/match/${platform}/${region}/${matchId}?highlight=${username}`
    }

}
