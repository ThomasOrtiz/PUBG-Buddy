import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Server } from '../../models/server';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';


export class RemoveUser extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'removeUser',
        description: 'Removes a user from the server\'s registery. ** Name is case sensitive **',
        usage: '<prefix>removeUser <username ...> [region=]',
        examples: [
            '!pubg-removeUser john',
            '!pubg-removeUser john jane',
            '!pubg-removeUser john region=na'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const region: string  = cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase();
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[region]);

        for (let i = 0; i < params.length; i++) {
            let username: string = params[i];

            if (username.indexOf('region=') >= 0) { continue; }

            this.removeUser(msg, api, region, username);
        }
    };

    private async removeUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Removing ${username} from server registry`) as Discord.Message;
        const pubgId: string = await pubgService.getPlayerId(api, username);

        if (!pubgId) {
            message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
            return;
        }

        let unregistered: boolean = await sqlServerRegisteryService.unRegisterUserToServer(pubgId, message.guild.id);
        if (unregistered) {
            message.edit(`Removed ${username} from server registry`);
        }
        else {
            message.edit(`${username} does not exist on server registery`);
        }

    }

}
