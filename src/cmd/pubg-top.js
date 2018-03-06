const Discord = require('discord.js');
const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let amount = 10;
    if(params[0]) {
        amount = +params[0];
    }

    let season;
    let region;
    let squadSize;
    let mode;
    let squadSizeString = '';

    
    let index = isSubstringOfElement('season=', params)
    if(index >= 0) {
        season = params[index].slice(params[index].indexOf('=') + 1);
    } else {
        season = await sql.getLatestSeason();
    }

    index = isSubstringOfElement('region=', params)
    if(index >= 0) {
        region = params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
    } else {
        region = 'na';
    }

    index = isSubstringOfElement('squadSize=', params)
    if(index >= 0) {
        squadSize = +params[index].slice(params[index].indexOf('=') + 1);
    } else {
        squadSize = +'4';
    }

    switch(squadSize) {
        case 1:
            squadSizeString = 'Solo';
            break;
        case 2:
            squadSizeString = 'Duo';
            break;
        case 4:
            squadSizeString = 'Squad';
            break;
    }

    index = isSubstringOfElement('mode=', params)
    if(index >= 0) {
        mode = params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
    } else {
        mode = 'fpp';
    }

    msg.channel.send('Aggregating top ' + amount + ' ... give me a second');
    
    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.channel.id);
    if(registeredPlayers.length === 0) {
        msg.channel.send('No users registered yes. Use `pubg-addUser <username>`');
        return;
    }
    
    // getPUBGCharacterData(id, username, season, region, 1, mode);
    let playerInfo = await scrape.aggregateData(registeredPlayers, season, region, squadSize, mode);
    let topPlayers = playerInfo.slice(0, amount);

    // Send a message every 5 players processed
    let amountProcessed = 0;
    while (amountProcessed < amount) {
        let fieldOffset = 10;

        let embed = new Discord.RichEmbed()
            .setTitle('PUBG Stats')
            .setColor(0x00AE86)
            .setDescription('Top ' + amount + ' local players -- ' + squadSizeString + ' - ' + mode)
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

function isSubstringOfElement(s, arr) {
    for(let i = 0; i < arr.length; i++) {
        if(arr[i].indexOf(s) >= 0) {
            return i;
        }
    }
    return -1;
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
    usage: 'pubg-top [Number-Of-Users] <season=[2018-01 || 2018-02 || 2018-03]> <region=#> <squadSize=#> <mode=[fpp || tpp]>'
};