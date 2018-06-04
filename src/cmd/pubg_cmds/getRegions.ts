import { SqlRegionsService as sqlRegionsService } from '../../services/sql.service';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class GetRegions extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };
    help: CommandHelp = {
        name: 'getRegions',
        description: 'Returns all available regions to use as parameters',
        usage: '<prefix>getRegions',
        examples: [
            '!pubg-getRegions'
        ]
    };

    async run(bot: any, msg: any, params: string[], perms: number) {
        let regions = await sqlRegionsService.getAllRegions();
        let regionStr: string = `= Regions =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(15)}: = Value =\n`;
        for (let i = 0; i < regions.length; i++) {
            let key: string = regions[i].fullname;
            let value: string = regions[i].shortname;
            regionStr += `${key.padEnd(15)}: ${value}\n`;
        }
        msg.channel.send(regionStr, { code: 'asciidoc' });
    };
}
