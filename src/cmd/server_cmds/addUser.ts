import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp, Server } from '../../models/models.module';
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
        description: 'Adds user(s) to the server\'s registery. ** Name is case sensitive **',
        usage: '<prefix>addUser <username ...> [region=]',
        examples: [
            '!pubg-addUser john',
            '!pubg-addUser john jane',
            '!pubg-addUser john region=eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const region: string  = cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase();
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[region]);

        for(let i = 0; i < params.length; i++) {
            let username: string = params[i];

            if (username.indexOf('region=') >= 0){ continue; }

            this.addUser(msg, api, region, username);
        }
    }

    private async addUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Checking for ${username}'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await pubgService.getPlayerId(api, username);

        if (pubgId && pubgId !== '') {
            const registered: boolean = await sqlServerRegisteryService.registerUserToServer(pubgId, message.guild.id);
            if (registered) {
                message.edit(`Added ${username}`);
            } else {
                message.edit(`Could not add ${username}`);
            }
        } else {
            message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
        }
    }

}
