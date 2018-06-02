import { SqlModesService as sqlModesService } from '../services/sql.service';

exports.run = async (bot, msg) => {
    let modes = await sqlModesService.getAllModes();

    let modeStr: string = `= Regions =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(25)}: = Value =\n`;
    for(let i = 0; i < modes.length; i++) {
        let key: string = modes[i].fullname;
        let value: string = modes[i].shortname;
        modeStr += `${key.padEnd(25)}: ${value}\n`;
    }

    msg.channel.send(modeStr, { code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'getModes',
    description: 'Returns all available modes to use as parameters',
    usage: '<prefix>getModes',
    examples: [
        '!pubg-getModes'
    ]
};