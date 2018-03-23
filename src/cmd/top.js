const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');
const SeasonEnum = require('../enums/season.enum');

exports.run = async (bot, msg, params) => {
    let amount = 10;
    if(params[0] && !isNaN(params[0])) {
        amount = +params[0];
    }
    let serverDefaults = await sql.getServerDefaults(msg.guild.id);
    let season = cs.getParamValue('season=', params, serverDefaults.default_season);
    let region = cs.getParamValue('region=', params, serverDefaults.default_region);
    let mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    let squadSize = +cs.getParamValue('squadSize=', params, serverDefaults.default_squadSize);
    let seasonId = SeasonEnum.get(season) || season;
    if(!checkParameters(msg, seasonId, region, mode, squadSize)) {
        return;
    }
    let squadSizeString = scrape.getSquadSizeString(squadSize);

    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.guild.id);
    if(registeredPlayers.length === 0) {
        msg.channel.send('No users registered yet. Use `pubg-addUser <username>`');
        return;
    }
    
    const batchEditAmount = 5;
    msg.channel.send(`Aggregating \`top ${amount}\` on \`${registeredPlayers.length} registered users\` ... give me a second`);
    msg.channel.send('Grabbing player data')
        .then(async (msg) => {
            let playersInfo = new Array();
            for(let i = 0; i < registeredPlayers.length; i++) {
                let player = registeredPlayers[i];

                if(i % batchEditAmount === 0) {
                    let max = (i+batchEditAmount) > registeredPlayers.length ? registeredPlayers.length : i+batchEditAmount;
                    msg.edit(`Grabbing data for players ${i+1} - ${max}`);
                }
                //msg.edit('(' + (i+1)  + '/' + registeredPlayers.length + '): Getting data for ' + player.username);                
                
                let id = await scrape.getCharacterID(player.username);
                let characterInfo = await scrape.getPUBGCharacterData(id, player.username, season, region, squadSize, mode);

                // Check if character info exists for this (it wont if a user hasn't played yet)
                if(!characterInfo) {
                    characterInfo = {
                        username: player.username,
                        rank: '',
                        rating: '',
                        topPercent: '',
                        kd: '',
                        kda: ''
                    };
                }
                playersInfo.push(characterInfo);
            } 

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
                let kdsStr = character.kd || character.kd === 0 ? character.kd + ' / ' + character.kda : 'Not available';
                names += character.username + '\n';
                ratings += ratingStr + '\n';
                kds += kdsStr + '\n';
            }

            embed.addField('Name', names, true)
                .addField('Rank / Rating', ratings, true)
                .addField('KD / KDA', kds, true);
            await msg.edit({ embed });
        });
};

function handleError(msg, errMessage) {
    msg.channel.send(`Error:: ${errMessage}\n\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`, { code: 'asciidoc'});
}

function checkParameters(msg, checkSeason, checkRegion, checkMode, checkSquadSize) {
    if(!scrape.isValidSeason(checkSeason)) {
        handleError(msg, 'Invalid season parameter');
        return false;
    }
    if(!scrape.isValidRegion(checkRegion)) {
        handleError(msg, 'Invalid region parameter');
        return false;
    }
    if(!scrape.isValidMode(checkMode)) {
        handleError(msg, 'Invalid mode parameter');
        return false;
    }
    if(!scrape.isValidSquadSize(checkSquadSize)) {
        handleError(msg, 'Invalid squadSize parameter');
        return false;
    }
    return true;
}

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

let help = exports.help = {
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
        '!pubg-top 5 season=2018-03 region=na squadSize=4 mode=tpp'
    ]
};