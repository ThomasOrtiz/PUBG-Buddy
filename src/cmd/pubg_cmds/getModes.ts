import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgService as pubgApiService } from '../../services/pubg.api.service';
import { AnalyticsService as analyticsService } from '../../services/analytics.service';


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
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length
        });

        let modes: string[] = pubgApiService.getAvailableModes();

        let modeStr: string = `= Modes =\n`;
        for (let i = 0; i < modes.length; i++) {
            modeStr += `${modes[i]}\n`;
        }

        msg.channel.send(modeStr, { code: 'asciidoc' });
    };
}
