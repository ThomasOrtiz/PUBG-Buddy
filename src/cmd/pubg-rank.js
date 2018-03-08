const Discord = require('discord.js');
const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    if(!params[0]) {
        msg.channel.send('Invalid usage: ' + help.usage);
        return;
    }
    let username = params[0].toLowerCase();
    let season = getParamValue('season=', params, await sql.getLatestSeason());
    let region = getParamValue('region=', params, 'na');
    let mode = getParamValue('mode=', params, 'fpp');
    
    msg.channel.send('Getting data for ' + username)
        .then(async (message) => {
            let id = await scrape.getCharacterID(username);
            let soloData = await scrape.getPUBGCharacterData(id, username, season, region, 1, mode);
            let duoData = await scrape.getPUBGCharacterData(id, username, season, region, 2, mode);
            let squadData = await scrape.getPUBGCharacterData(id, username, season, region, 4, mode);
            let embed = new Discord.RichEmbed()
                .setTitle('Ranking: ' + username)
                .setDescription('Season:\t' + season + '\nRegion:\t' + region.toUpperCase())
                .setColor(0x00AE86)
                .setFooter('Data retrieved from https://pubg.op.gg/')
                .setTimestamp()
                
                .addBlankField(false)
                .addField('Type', mode.toUpperCase() + ' Solo', true)
                .addField('Grade', soloData.grade, true)
                .addField('Rank', soloData.ranking, true)
                .addField('Top %', soloData.topPercent, true)
                .addField('Longest Kill', soloData.longest_kill, true)
                .addField('Average Damage', soloData.average_damage_dealt, true)
                .addBlankField(false)

                .addField('Type', mode.toUpperCase() + ' Duo', true)
                .addField('Grade', duoData.grade, true)
                .addField('Rank', duoData.ranking, true)
                .addField('Top %', duoData.topPercent, true)
                .addField('Longest Kill', duoData.longest_kill, true)
                .addField('Average Damage', duoData.average_damage_dealt, true)
                .addBlankField(false)

                .addField('Type', mode.toUpperCase() + ' Squad', true)
                .addField('Grade', squadData.grade, true)
                .addField('Rank', squadData.ranking, true)
                .addField('Top %', squadData.topPercent, true)
                .addField('Longest Kill', squadData.longest_kill, true)
                .addField('Average Damage', squadData.average_damage_dealt, true)
            message.edit({embed});
        });
}

function isSubstringOfElement(s, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i].indexOf(s) >= 0) {
            return i;
        }
    }
    return -1;
}

function getParamValue(search, params, defaultParam) {
    let index = isSubstringOfElement(search, params);
    if(index >= 0) {
        return params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
    } else {
        return defaultParam;
    }
}


exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

let help = {
    name: 'pubg-rank',
    description: 'Returns ranking details of user.',
    usage: 'pubg-rank [pubg username] <season=[2018-01, 2018-02,2018-03]> <region=[na, as, kr/jp, kakao, sa, eu, oc, sea]> <mode=[fpp || tpp]>'
};
exports.help = help;