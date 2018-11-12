import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    ParameterService as parameterService,
    PubgPlayerService,
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server, PubgParameters } from '../../interfaces';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';


export class AddUser extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'addUser',
        description: 'Adds a user to the server\'s registery. ** Name is case sensitive **',
        usage: '<prefix>addUser <username> [region=]',
        examples: [
            '!pubg-addUser john',
            '!pubg-addUser "Player A"',
            '!pubg-addUser john region=pc-eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServer(msg.guild.id);
        const pubg_params: PubgParameters = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[pubg_params.region]);

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            region: pubg_params.region
        });

        this.addUser(msg, api, pubg_params.region, pubg_params.username);
    }

    private async addUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Checking for \`${username}\`'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (pubgId && pubgId !== '') {
            const registered: boolean = await sqlServerRegisteryService.registerUserToServer(pubgId, message.guild.id);
            if (registered) {
                message.edit(`Added \`${username}\``);
            } else {
                message.edit(`Could not add \`${username}\``);
            }
        } else {
            message.edit(`Could not find **${username}** on the \`${region}\` region. Double check the username and region.`);
        }
    }

}
