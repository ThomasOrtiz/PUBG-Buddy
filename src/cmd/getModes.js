const ModeEnum = require('../enums/mode.enum');

exports.run = async (bot, msg) => {
    let enumStr = '= Modes =\n\nUse the value for parameters\n\n= Key =\t: = Value =\n';
    let modes = ModeEnum.getAllValues();
    for(let i = 0; i < modes.length; i++) {
        let value = modes[i];
        let key = ModeEnum.getKeyFromValue(value);
        enumStr += `${key}\t\t: ${value}\n`;
    }
    

    msg.channel.send(enumStr, { code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'getModes',
    description: 'Returns all available modes',
    usage: '<prefix>getModes',
    examples: [
        '!pubg-getModes'
    ]
};