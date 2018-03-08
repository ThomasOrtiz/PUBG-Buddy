const Discord = require('discord.js');
const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let amount = 10;
    if(params[0]) {
        amount = +params[0];
    }

    let season = getParamValue('season=', params, await sql.getLatestSeason());
    let region = getParamValue('region=', params, 'na');
    let mode = getParamValue('mode=', params, 'fpp');
    let squadSize = getParamValue('squadSize=', params, 4);
    let squadSizeString = '';

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
    
    msg.channel.send('Aggregating top ' + amount + ' ... give me a second');
    
    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.guild.id);
    if(registeredPlayers.length === 0) {
        msg.channel.send('No users registered yes. Use `pubg-addUser <username>`');
        return;
    }
    
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

exports.help = {
    name: 'pubg-top',
    description: 'Gets the top "x" players registered in the server',
    usage: 'pubg-top [Number-Of-Users] <season=[2018-01, 2018-02,2018-03]> <region=[na, as, kr/jp, kakao, sa, eu, oc, sea]> <squadSize=#> <mode=[fpp || tpp]>'
};