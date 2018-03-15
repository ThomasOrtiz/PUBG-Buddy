const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        msg.channel.send('Invalid usage: ' + help.usage);
        return;
    }
    let username = params[0].toLowerCase();
    let serverDefaults = await sql.getServerDefaults(msg.guild.id);
    let season = cs.getParamValue('season=', params, serverDefaults.default_season);
    let region = cs.getParamValue('region=', params, serverDefaults.default_region);
    let mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    
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
                .addField('Average Damage', squadData.average_damage_dealt, true);
            message.edit({embed});
        });
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

let help = exports.help = {
    name: 'rank',
    description: 'Returns a players solo, duo, and squad ranking details.',
    usage: '<prefix>rank <pubg username> [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [mode=(fpp | tpp)]',
    examples: [
        '!pubg-rank john',
        '!pubg-rank john season=2018-03',
        '!pubg-rank john season=2018-03 region=eu',
        '!pubg-rank john season=2018-03 region=na mode=tpp',
        '!pubg-rank john region=as mode=tpp season=2018-03',
    ]
};