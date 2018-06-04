import { SqlSqaudSizeService as sqlSqaudSizeService } from '../../services/sql.service';
import { SquadSize } from '../../models/squadSize';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class GetSquadSizes extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'getSquadSizes',
        description: 'Returns all available squad sizes to use as parameters',
        usage: '<prefix>getSquadSizes',
        examples: [
            '!pubg-getSquadSizes'
        ]
    }

    async run(bot: any, msg: any, params: string[], perms: number) {
        let squadSizes: SquadSize[] = await sqlSqaudSizeService.getAllSquadSizes();

        let squadSizeStr: string = `= Regions =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(8)}: = Value =\n`;
        for(let i = 0; i < squadSizes.length; i++) {
            const key: string = squadSizes[i].name;
            const value: number = squadSizes[i].size;
            squadSizeStr += `${key.padEnd(8)}: ${value}\n`;
        }

        msg.channel.send(squadSizeStr, { code: 'asciidoc'});
    }
}
