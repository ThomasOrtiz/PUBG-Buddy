const Discord = require('discord.js');
const scrape = require('../pubg.service');
const cache = require('../caching');

exports.run = run;

async function run(bot, msg, params) {
    let userToIdMapping = await cache.getUserToIdCache();

    let username = params[0].toLowerCase();
    let id = await scrape.getCharacterID(userToIdMapping, username);
    let data = await scrape.getPUBGCharacterData(id, username);
    let embed = new Discord.RichEmbed()
        .setTitle('PUBG Stats')
        .setColor(0x00AE86)
        .setDescription(username)
        .setFooter('Data retrieved from https://pubg.op.gg/')
        .setTimestamp()
        .addField('Type', 'FPP Squad', true)
        .addField('Rank', data.ranking, true)
        .addField('Top %', data.topPercent, true)
        .addBlankField(true);

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