const sql = require('../services/sql.service');
const SeasonEnum = require('../enums/season.enum');

exports.run = async (bot, msg) => {
    let seasons = await sql.getAllSeasons();

    let seasonStr = '= Seasons =\n\nUse the value for parameters\n\n= Key =\t : = Value =\n';
    for(let i = 0; i < seasons.length; i++) {
        let value = seasons[i];
        let key = SeasonEnum.getKeyFromValue(value);
        seasonStr += `${key}\t: ${value}\n`;
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
    description: 'Returns all available seasons',
    usage: '<prefix>getSeasons',
    examples: [
        '!pubg-getSeasons'
    ]
};