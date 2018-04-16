const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');
const SeasonEnum = require('../enums/season.enum');
const SquadSizeEnum = require('../enums/squadSize.enum');

exports.run = async (bot, msg, params) => {
    let amount = 10;
    if(params[0] && !isNaN(params[0])) {
        amount = +params[0];
    }
    let serverDefaults = await sql.getServerDefaults(msg.guild.id);
    let season = cs.getParamValue('season=', params, serverDefaults.default_season);
    let region = cs.getParamValue('region=', params, serverDefaults.default_region);
    let mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    let squadSize = cs.getParamValue('squadSize=', params, serverDefaults.default_squadSize);

    let checkingParametersMsg = await msg.channel.send('Checking for valid parameters ...');
    if(!(await checkParameters(msg, season, region, mode, squadSize))) {
        checkingParametersMsg.delete();
        return;
    }


    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.guild.id);
    if(registeredPlayers.length === 0) {
        cs.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command');
        return;
    }
    
    const batchEditAmount = 5;
    checkingParametersMsg.edit(`Aggregating \`top ${amount}\` on \`${registeredPlayers.length} registered users\` ... give me a second`);
    msg.channel.send('Grabbing player data')
        .then(async (msg) => {
            let playersInfo = new Array();
            for(let i = 0; i < registeredPlayers.length; i++) {
                let player = registeredPlayers[i];

                if(i % batchEditAmount === 0) {
                    let max = (i+batchEditAmount) > registeredPlayers.length ? registeredPlayers.length : i+batchEditAmount;
                    msg.edit(`Grabbing data for players ${i+1} - ${max}`);
                }            
                
                let id = await scrape.getCharacterID(player.username, region);
                let characterInfo = await scrape.getPUBGCharacterData(id, player.username, season, region, +squadSize, mode);

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
                .setDescription('Season:\t' + SeasonEnum.get(season) + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase() + '\nSquad Size: \t' + SquadSizeEnum.get(squadSize))
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

async function checkParameters(msg, checkSeason, checkRegion, checkMode, checkSquadSize) {
    let errMessage = '';

    let validSeason = await scrape.isValidSeason(checkSeason);
    let validRegion = await scrape.isValidRegion(checkRegion);
    let validMode = await scrape.isValidMode(checkMode);
    let validSquadSize = await scrape.isValidSquadSize(checkSquadSize);

    if(!validSeason) {
        let seasons = await sql.getAllSeasons();
        let availableSeasons = '== Available Seasons ==\n';
        for(let i = 0; i < seasons.length; i++) {
            if(i < seasons.length-1) {
                availableSeasons += seasons[i].season + ', ';
            } else {
                availableSeasons += seasons[i].season; 
            }
        }
        errMessage += `Error:: Invalid season parameter\n${availableSeasons}\n`;
    }
    if(!validRegion) {
        let regions = await sql.getAllRegions();
        let availableRegions = '== Available Regions ==\n';
        for(let i = 0; i < regions.length; i++) {
            if(i < regions.length-1) {
                availableRegions += regions[i].shortname + ', ';
            } else {
                availableRegions += regions[i].shortname;
            }
        }
        errMessage += `\nError:: Invalid region parameter\n${availableRegions}\n`;
    }
    if(!validMode) {
        let modes = await sql.getAllModes();
        let availableModes = '== Available Modes ==\n';
        for(let i = 0; i < modes.length; i++) {
            if(i < modes.length-1) {
                availableModes += modes[i].shortname + ', ';
            } else {
                availableModes += modes[i].shortname;
            }
        }
        errMessage += `\nError:: Invalid mode parameter\n${availableModes}\n`;
    }
    if(!validSquadSize) {
        let squadSizes = await sql.getAllSquadSizes();
        let availableSizes = '== Available Squad Sizes ==\n';
        for(let i = 0; i < squadSizes.length; i++) {
            if(i < squadSizes.length-1) {
                availableSizes += squadSizes[i].size + ', ';
            } else {
                availableSizes += squadSizes[i].size;
            }
        }
        errMessage += `\nError:: Invalid squad size parameter\n${availableSizes}\n`;
    }

    if(!validSeason || !validRegion || !validMode || !validSquadSize) {
        cs.handleError(msg, errMessage, help);
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