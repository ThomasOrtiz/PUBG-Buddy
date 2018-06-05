import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Server } from '../../models/server';

export class AddUser extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'addUser',
        description: 'Adds user(s) to the server\'s registery.',
        usage: '<prefix>addUser <username ...> [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)]',
        examples: [
            '!pubg-addUser john',
            '!pubg-addUser john jane',
            '!pubg-addUser john region=eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if(!params[0]) {
            cs.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }

        for(let i=0; i < params.length; i++) {
            let username: string = params[i].toLowerCase();
            if(username.indexOf('region=') >= 0){
                continue;
            }

            let serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
            let region: string = cs.getParamValue('region=', params, serverDefaults.default_region);

            msg.channel.send(`Checking for ${username}'s PUBG Id ... give me a second`)
                .then(async (message: Discord.Message) => {
                    let pubgId: string = await pubgService.getCharacterID(username, region);

                    if (pubgId && pubgId !== '') {
                        let registered: boolean = await sqlServerRegisteryService.registerUserToServer(pubgId, message.guild.id);
                        if(registered) {
                            message.edit(`Added ${username}`);
                        } else {
                            message.edit(`Could not add ${username}`);
                        }
                    } else {
                        message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
                    }
                });
        }
    }
}
