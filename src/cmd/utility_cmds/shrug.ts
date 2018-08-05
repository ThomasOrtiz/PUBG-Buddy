import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import * as mixpanel from '../../services/analytics.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';


export class Shrug extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'shrug',
        description: 'Get your shrug on',
        usage: '<prefix>shrug <amount of shrugs <= 15>',
        examples: [
            '!pubg-shrug',
            '!pubg-shrug 5'
        ]
    };

    run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        mixpanel.track(this.help.name, {
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });

        let shrugString: string = '';
        let amount: number = 1;
        if (params[0] && !isNaN(+params[0])) {
            amount = +params[0];
            if (amount > 15) {
                amount = 15;
            }
        }
        for (let i = 0; i < amount; i++) {
            let backslash: string = '\\';
            shrugString += '¯' + backslash.repeat(3) + '_ツ' + backslash + '_/¯\t';
        }
        msg.channel.send(shrugString);
    };

}
