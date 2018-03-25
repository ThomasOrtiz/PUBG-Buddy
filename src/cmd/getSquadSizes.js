const sql = require('../services/sql.service');

exports.run = async (bot, msg) => {
    let squadSizes = await sql.getAllSquadSizes();

    let squadSizeStr = `= Regions =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(8)}: = Value =\n`;
    for(let i = 0; i < squadSizes.length; i++) {
        let key = squadSizes[i].name;
        let value = squadSizes[i].size;
        squadSizeStr += `${key.padEnd(8)}: ${value}\n`;
    }

    msg.channel.send(squadSizeStr, { code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'getSquadSizes',
    description: 'Returns all available squad sizes to use as parameters',
    usage: '<prefix>getSquadSizes',
    examples: [
        '!pubg-getSquadSizes'
    ]
};