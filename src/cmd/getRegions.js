const RegionEnum = require('../enums/region.enum');

exports.run = async (bot, msg) => {
    let enumStr = '= Regions =\n\n';
    let regions = RegionEnum.getAllValues();
    for(let i = 0; i < regions.length; i++) {
        enumStr += `${regions[i]}`;
        if(i !== regions.length-1) {
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
    name: 'getRegions',
    description: 'Returns all available regions',
    usage: '<prefix>getRegions',
    examples: [
        '!pubg-getRegions'
    ]
};