import * as Discord from 'discord.js';
import {
    AnalyticsService,
    CommonService,
    DiscordMessageService,
    ParameterService,
    PubgPlatformService, PubgPlayerService, PubgRatingService, PubgValidationService,
    SqlServerService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats, Season } from '../../pubg-typescript-api';
import { PubgParameters } from '../../interfaces';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


interface ParameterMap {
    discordId: string,
    username: string;
    season: string;
    region: string;
    mode: string;
}

export class Role extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0,
    }

    help: CommandHelp = {
        name: 'role',
        description: "Assign the Discord User a role based off of PUBG's Suvival Title system.",
        usage: '<prefix>role',
        examples: [
            '!pubg-role',
            '!pubg-role [@Discord_Mention]'
        ]
    }

    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const botHasPermissions: boolean = msg.guild.members.find('id', bot.user.id).hasPermission('MANAGE_ROLES');
        if (!botHasPermissions) {
            await msg.channel.send(':warning: Bot is missing the `General Permissions > Manage Roles` permission. Give permission so the bot can assign roles. :warning:');
            return;
        }

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

        let user: Discord.User = msg.author;
        if (user.id !== this.paramMap.discordId) {
            user = await bot.fetchUser(this.paramMap.discordId);
        }

        const seasonData: PlayerSeason = await this.getPlayerSeasonData(reply);
        await this.ensureRolesExist(msg.guild);
        await this.updateRoles(reply, seasonData, user);
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

        const serverDefaults = await SqlServerService.getServer(msg.guild.id);

        // Get DiscordId
        const mentionRegEx: RegExp = /<@(\d*)>/;
        const regExResult: Array<any> = params.join(' ').match(mentionRegEx);
        let discordId: string;
        if(regExResult) {
            discordId = regExResult[1];
            params.shift();
        }

        if (!discordId) {
            discordId = msg.author.id;
        }

        pubg_params = await ParameterService.getPubgParameters(params.join(' '), discordId, true, serverDefaults);
        const seasonObj: Season = await PubgSeasonService.getCurrentSeason(PubgPlatformService.getApi(PlatformRegion[pubg_params.region]));
        pubg_params.season = PubgSeasonService.getSeasonDisplayName(seasonObj);


        // Throw error if no username supplied
        if (!pubg_params.username) {
            DiscordMessageService.handleError(msg, 'Error:: Must use a user that is registered with the `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            discordId: discordId,
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

    private async getPlayerSeasonData(msg: Discord.Message): Promise<PlayerSeason> {
        const message: Discord.Message = await msg.edit(`Getting data for **${this.paramMap.username}**`);
        const pubgPlayersApi: PubgAPI = new PubgAPI(CommonService.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const players: Player[] = await PubgPlayerService.getPlayersByName(pubgPlayersApi, [this.paramMap.username]);
        const errorMessage: string = `Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`;

        if (players.length === 0) {
            message.edit(errorMessage);
            return;
        }
        const player: Player = players[0];
        if (!player.id) {
            message.edit(errorMessage);
            return;
        }

        // Get Player Data
        try {
            const seasonStatsApi: PubgAPI = PubgPlatformService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);
            return await PubgPlayerService.getPlayerSeasonStatsById(seasonStatsApi, player.id, this.paramMap.season);
        } catch(e) {
            message.edit(errorMessage);
            return;
        }
    }

    private async ensureRolesExist(guild: Discord.Guild) {
        const roles: Discord.RoleData[] = [
            {
                name: 'PUBG-Beginner',
                color: 'cd7f32', // bronze
                mentionable: true
            },
            {
                name: 'PUBG-Novice',
                color: 'D3D3D3', // silver
                mentionable: true
            },
            {
                name: 'PUBG-Experienced',
                color: 'fff000', // yellow
                mentionable: true
            },
            {
                name: 'PUBG-Skilled',
                color: '8dacc3', // blue
                mentionable: true
            },
            {
                name: 'PUBG-Specialist',
                color: '9ba1cf', // purple
                mentionable: true
            },
            {
                name: 'PUBG-Expert',
                color: 'ffe449',  // gold
                mentionable: true
            },
            {
                name: 'PUBG-Survivor',
                color: 'ffda07',
                mentionable: true
            }// ,
            // {
            //     name: 'PUBG-GrandMaster',
            //     color: color,
            //     mentionable: true
            // },
        ];

        const existingRoles: Discord.Collection<string, Discord.Role> = guild.roles;
        roles.forEach(async (role) => {
            const roleAlreadyExists: boolean = existingRoles.exists('name', role.name);
            if (!roleAlreadyExists) {
                await guild.createRole(role).catch(console.error);
            };
        });

    }

    private async updateRoles(msg: Discord.Message, seasonData: PlayerSeason, author: Discord.User) {
        await msg.edit('Updating roles ...');

        const pubgRoleNames: string[] = [
            'PUBG-Beginner',
            'PUBG-Novice',
            'PUBG-Experienced',
            'PUBG-Skilled',
            'PUBG-Specialist',
            'PUBG-Expert',
            'PUBG-Survivor'
        ];
        const member: Discord.GuildMember = msg.guild.member(author.id);
        const roles: Discord.Collection<string, Discord.Role> = member.roles;
        const nonPubgRoles: Discord.Collection<string, Discord.Role> = roles.filter(role => !pubgRoleNames.includes(role.name));

        // get role to add
        const seasonStats: GameModeStats[] = [seasonData.soloStats, seasonData.soloFPPStats, seasonData.duoStats, seasonData.duoFPPStats, seasonData.squadStats, seasonData.squadFPPStats];
        let rankPointsArray: string[] = [];

        for (let stats of seasonStats) {
            rankPointsArray.push(stats.rankPointsTitle);
        }

        rankPointsArray.sort((a: string, b: string) => {
            let titleComponents: string[] = a.split('-');
            const a_Title: number = +titleComponents[0];
            const a_Level: number = +titleComponents[1];

            titleComponents = b.split('-');
            const b_Title: number = +titleComponents[0];
            const b_Level: number = +titleComponents[1];

            if (a_Title !== b_Title) {
                return b_Title - a_Title;
            } else {
                return b_Level - a_Level;
            }
        });
        if (rankPointsArray.length === 0) { return; }

        const rankTitle = PubgRatingService.getSurivivalTitle(rankPointsArray[0]).split(' ')[0];
        if (rankTitle === 'Unknown') { return; }

        await msg.edit(`Assigning **PUBG-${rankTitle}** to **${author.username}**`);

        // Add roles
        const role: Discord.Role = msg.guild.roles.find("name", `PUBG-${rankTitle}`);
        const newRoles: Discord.Role[] = [];

        // preserve original roles
        for(let role of nonPubgRoles) {
            newRoles.push(role[1]);
        }
        newRoles.push(role); // push the new pubg role

        await member.setRoles(newRoles).catch(console.error);
    }


}
