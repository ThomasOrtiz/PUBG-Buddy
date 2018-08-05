import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';


export class GetModes extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: ['getModes'],
        permLevel: 0
    }

    help: CommandHelp= {
        name: 'modes',
        description: 'Returns all available modes to use as parameters',
        usage: '<prefix>modes',
        examples: [
            '!pubg-modes'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let modes: string[] = pubgApiService.getAvailableModes();

        let modeStr: string = `= Modes =\n`;
        for (let i = 0; i < modes.length; i++) {
            modeStr += `${modes[i]}\n`;
        }

        msg.channel.send(modeStr, { code: 'asciidoc' });
    };
}
