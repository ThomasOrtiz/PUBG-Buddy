const Discord = require('discord.js');
const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let amount = params[0];
    msg.channel.send('Aggregating top ' + amount + ' ... give me a second');
    
    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.channel.id);
    let playerInfo = await scrape.aggregateData(registeredPlayers);
    let topPlayers = playerInfo.slice(0, amount);

    // Make one every 5
    let amountProcessed = 0;
    while (amountProcessed < amount) {
        let fieldOffset = 10;
        let embed = new Discord.RichEmbed()
            .setTitle('PUBG Stats')
            .setColor(0x00AE86)
            .setDescription('Top ' + amount + ' local players in ' + ' Squad FPP')
            .setFooter('Data retrieved from https://pubg.op.gg/')
            .setTimestamp();

        let end = amountProcessed + fieldOffset;
        let names = '';
        let ranks = '';
        let topPercents = '';


        for (var i = amountProcessed; i < topPlayers.length && i < end; i++) {
            var character = topPlayers[i];
            names += character.nickname + '\n';
            ranks += character.ranking + '\n';
            topPercents += character.topPercent + '\n';
        }

        embed.addField('Name', names, true)
            .addField('Rank', ranks, true)
            .addField('Top %', topPercents, true);
        amountProcessed += fieldOffset;
        msg.channel.send({ embed });
    }
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-top',
    description: 'Gets the top "x" players registered in the server',
    usage: 'pubg-top [Number-Of-Users]'
};