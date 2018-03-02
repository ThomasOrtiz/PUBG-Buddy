const Discord = require('discord.js');
const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();
    
    let season;
    if(params.length > 1 && params[1].indexOf('season=') >= 0) {
        season = params[1].slice(params[1].indexOf('=') + 1);
    } else {
        season = await sql.getLatestSeason();
    }

    let region = 'na';
    let mode = 'fpp';
    

    let id = await scrape.getCharacterID(username);
    let soloData = await scrape.getPUBGCharacterData(id, username, season, region, 1, mode);
    let duoData = await scrape.getPUBGCharacterData(id, username, season, region, 2, mode);
    let squadData = await scrape.getPUBGCharacterData(id, username, season, region, 4, mode);
    let embed = new Discord.RichEmbed()
        .setTitle('PUBG Stats')
        .setColor(0x00AE86)
        .setDescription(username)
        .setFooter('Data retrieved from https://pubg.op.gg/')
        .setTimestamp()
        .addField('Type', 'FPP Solo', true)
        .addField('Rank', soloData.ranking, true)
        .addField('Top %', soloData.topPercent, true)
        .addField('Type', 'FPP Duo', true)
        .addField('Rank', duoData.ranking, true)
        .addField('Top %', duoData.topPercent, true)
        .addField('Type', 'FPP Squad', true)
        .addField('Rank', squadData.ranking, true)
        .addField('Top %', squadData.topPercent, true)

    msg.channel.send({embed});
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-rank',
    description: 'Returns ranking details of user.',
    usage: 'pubg-rank [pubg username]'
};