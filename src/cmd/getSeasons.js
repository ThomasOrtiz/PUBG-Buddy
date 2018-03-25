const sql = require('../services/sql.service');

exports.run = async (bot, msg) => {
    let seasons = await sql.getAllSeasons();

    let seasonStr = `= Seasons =\n\nUse the value for parameters\n\n${'= Key ='.padEnd(10)}: = Value =\n`;
    for(let i = 0; i < seasons.length; i++) {
        let key = seasons[i].name;
        let value = seasons[i].season;
        seasonStr += `${key.padEnd(10)}: ${value}\n`;
    }
    
    msg.channel.send(seasonStr, { code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'getSeasons',
    description: 'Returns all available seasons to use as parameters',
    usage: '<prefix>getSeasons',
    examples: [
        '!pubg-getSeasons'
    ]
};