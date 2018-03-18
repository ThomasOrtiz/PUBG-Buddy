const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    let amount = 10;
    if(params[0] && !isNaN(params[0])) {
        amount = +params[0];
    }
    let serverDefaults = await sql.getServerDefaults(msg.guild.id);
    let season = cs.getParamValue('season=', params, serverDefaults.default_season);
    let region = cs.getParamValue('region=', params, serverDefaults.default_region);
    let mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    let squadSize = +cs.getParamValue('squadSize=', params, serverDefaults.default_squadsize);
    let squadSizeString = scrape.getSquadSizeString(squadSize);

    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.guild.id);
    if(registeredPlayers.length === 0) {
        msg.channel.send('No users registered yet. Use `pubg-addUser <username>`');
        return;
    }
    
    msg.channel.send('Aggregating top ' + amount + ' ... give me a second');
    msg.channel.send('Grabbing individual player data')
        .then(async (msg) => {
            let playersInfo = new Array();
            for(let i = 0; i < registeredPlayers.length; i++) {
                let player = registeredPlayers[i];
                msg.edit('(' + (i+1)  + '/' + registeredPlayers.length + '): Getting data for ' + player.username);
                let id = await scrape.getCharacterID(player.username);
                if(!id) {
                    msg.edit('Invalid username: ' + player.username);
                }
                let characterInfo = await scrape.getPUBGCharacterData(id, player.username, season, region, squadSize, mode);

                // Check if character info exists for this (it wont if a user hasn't played yet)
                if(!characterInfo) {
                    characterInfo = {
                        nickname: player.username,
                        rank: '',
                        rating: '',
                        topPercent: '',
                        kd: '',
                        kda: ''
                    };
                }
                playersInfo.push(characterInfo);
            }

            msg.edit('Sorting players based off rank');
            // Sorting Array based off of ranking (higher ranking is better)
            playersInfo.sort(function(a, b){ return b.rating - a.rating; });

            let topPlayers = playersInfo.slice(0, amount);

            let embed = new Discord.RichEmbed()
                .setTitle('Top ' + amount + ' local players')
                .setDescription('Season:\t' + season + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase() + '\nSquad Size: \t' + squadSizeString)
                .setColor(0x00AE86)
                .setFooter('Data retrieved from https://pubg.op.gg/')
                .setTimestamp();

            let names = '';
            let ratings = '';
            let kds = '';

            // Construct top strings
            for (var i = 0; i < topPlayers.length; i++) {
                let character = topPlayers[i];
                let ratingStr = character.rating ? character.rank + ' / ' + character.rating : 'Not available';
                let kdsStr = character.kd ? character.kd + ' / ' + character.kda : 'Not available';
                //let topPercentStr = character.topPercent ? character.topPercent + '\n': 'Not available\n';
                names += character.nickname + '\n';
                ratings += ratingStr + '\n';
                kds += kdsStr + '\n';
                //topPercents += topPercentStr;
            }

            embed.addField('Name', names, true)
                .addField('Rank / Rating', ratings, true)
                .addField('KD / KDA', kds, true);
            msg.edit({ embed });
        });
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'top',
    description: 'Gets the top "x" players registered in the server',
    usage: '<prefix>top [Number-Of-Users] [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [squadSize=(1 | 2 | 4)] [mode=(fpp | tpp)]',
    examples: [
        '!pubg-top',
        '!pubg-top season=2018-03',
        '!pubg-top season=2018-03 region=na',
        '!pubg-top season=2018-03 region=na squadSize=4',
        '!pubg-top season=2018-03 region=na squadSize=4 mode=tpp',
        '!pubg-top 5',
        '!pubg-top 5 season=2018-03',
        '!pubg-top 5 season=2018-03 region=na', 
        '!pubg-top 5 season=2018-03 region=na squadSize=4', 
        '!pubg-top 5 season=2018-03 region=na squadSize=4 mode=tpp',
        
    ]
};