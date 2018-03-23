const SquadSizeEnum = require('../enums/squadSize.enum');

exports.run = async (bot, msg) => {
    let enumStr = '= Squad Sizes =\n\n';
    let sizes = SquadSizeEnum.getAllValues();
    for(let i = 0; i < sizes.length; i++) {
        enumStr += `${sizes[i]}`;
        if(i !== sizes.length-1) {
            enumStr += ', ';
        }
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
    name: 'getSquadSizes',
    description: 'Returns all available squad sizes',
    usage: '<prefix>getSquadSizes',
    examples: [
        '!pubg-getSquadSizes'
    ]
};