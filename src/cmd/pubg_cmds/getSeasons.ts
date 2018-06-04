import { SqlSeasonsService as sqlSeasonsService } from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class GetSeasons extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'getSeasons',
        description: 'Returns all available seasons to use as parameters',
        usage: '<prefix>getSeasons',
        examples: [
            '!pubg-getSeasons'
        ]
    }

    async run(bot: any, msg: any, params: string[], perms: number) {
        let seasons = await sqlSeasonsService.getAllSeasons();
        let seasonStr: string = `= Seasons =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(10)}: = Value =\n`;
        for (let i = 0; i < seasons.length; i++) {
            let key: string = seasons[i].name;
            let value: string = seasons[i].season;
            seasonStr += `${key.padEnd(10)}: ${value}\n`;
        }
        msg.channel.send(seasonStr, { code: 'asciidoc' });
    };
}
