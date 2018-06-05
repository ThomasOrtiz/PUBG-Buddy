import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommandConfiguration, CommandHelp } from '../../models/command';
import { SqlModesService as sqlModesService } from '../../services/sql.service';
import { Command } from '../../models/command';



export class GetModes extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    }

    help: CommandHelp= {
        name: 'getModes',
        description: 'Returns all available modes to use as parameters',
        usage: '<prefix>getModes',
        examples: [
            '!pubg-getModes'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let modes: any = await sqlModesService.getAllModes();
        let modeStr: string = `= Regions =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(25)}: = Value =\n`;
        for (let i = 0; i < modes.length; i++) {
            let key: string = modes[i].fullname;
            let value: string = modes[i].shortname;
            modeStr += `${key.padEnd(25)}: ${value}\n`;
        }
        msg.channel.send(modeStr, { code: 'asciidoc' });
    };
}
