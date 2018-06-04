import { Message } from 'discord.js';
import { Command, CommandMessage, CommandoClient } from 'discord.js-commando';
import { PubgService as pubgService } from '../../services/pubg.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services/sql.service';

export default class AddUser extends Command {
    help = {
        usage: '<prefix>addUser <username ...> [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)]',
    }

    constructor(client: CommandoClient) {
		super(client, {
			name: 'adduser',
			group: 'server',
			memberName: 'adduser',
			description: `Adds user(s) to the server's registery.`,
			guildOnly: true,
			throttling: {
				usages: 2,
				duration: 3
            },
            examples: [
                '!pubg-addUser john',
                '!pubg-addUser john jane',
                '!pubg-addUser john region=eu'
            ],
			args: [
				{
					key: 'username',
					prompt: 'What username?\n',
                    type: 'string'

				},
				{
					key: 'region',
					prompt: 'Which pubg region?\n',
					type: 'string',
					default: 'na'
				}
            ]
		});
    }

    public hasPermission(msg: CommandMessage): boolean {
		return true;
	}

	public async run(msg: CommandMessage, args: { username: string, region: string }): Promise<Message | Message[]> {
        if(!args.username[0]) {
            //cs.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }
        const username: string = args.username;
        const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
        const region: string = args.region || serverDefaults.default_region;

        msg.channel.send(`Checking for ${username}'s PUBG Id ... give me a second`)
            .then(async (message: Message) => {
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
