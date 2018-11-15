import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    DiscordMessageService as discordMessageService,
    ParameterService as parameterService,
    PubgPlayerService,
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService,
    PubgPlatformService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server, PubgParameters } from '../../interfaces';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';


export class RemoveUser extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'removeUser',
        description: 'Removes a user from the server\'s registery. **Name is case sensitive**',
        usage: '<prefix>removeUser <username ...> [region=]',
        examples: [
            '!pubg-removeUser john',
            '!pubg-removeUser "Player A"',
            '!pubg-removeUser john region=pc-na'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            discordMessageService.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServer(msg.guild.id);
        const pubg_params: PubgParameters = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[pubg_params.region]);

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            region: pubg_params.region
        });

        this.removeUser(msg, api, pubg_params.region, pubg_params.username);
    };

    private async removeUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Removing **${username}** from server registry`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (!pubgId) {
            message.edit(`Could not find **${username}** on the **${region}** region. Double check the username and region.`);
            return;
        }

        let unregistered: boolean = await sqlServerRegisteryService.unRegisterUserToServer(pubgId, message.guild.id);
        if (unregistered) {
            message.edit(`Removed **${username}** from server registry`);
        }
        else {
            message.edit(`**${username}** does not exist on server registery`);
        }

    }

}
