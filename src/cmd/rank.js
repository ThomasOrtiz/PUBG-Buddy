const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');
const SeasonEnum = require('../enums/season.enum');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        cs.handleError(msg, 'Error:: Must specify a username', help);
        return;
    }
    let username = params[0].toLowerCase();
    let serverDefaults, season, region, mode;
    if(msg.guild) {
        serverDefaults = await sql.getServerDefaults(msg.guild.id);
        season = cs.getParamValue('season=', params, serverDefaults.default_season);
        region = cs.getParamValue('region=', params, serverDefaults.default_region);
        mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    } else {
        season = cs.getParamValue('season=', params, await sql.getLatestSeason());
        region = cs.getParamValue('region=', params, 'na');
        mode = cs.getParamValue('mode=', params, 'fpp');
    }

    let checkingParametersMsg = await msg.channel.send('Checking for valid parameters ...');
    if(!(await checkParameters(msg, season, region, mode))) {
        checkingParametersMsg.delete();
        return;
    }
    
    checkingParametersMsg.edit(`Getting data for ${username}`)
        .then(async (message) => {
            let id = await scrape.getCharacterID(username, region);
            if(!id) {
                message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
                return;
            }
            let soloData = await scrape.getPUBGCharacterData(id, username, season, region, 1, mode);
            let duoData = await scrape.getPUBGCharacterData(id, username, season, region, 2, mode);
            let squadData = await scrape.getPUBGCharacterData(id, username, season, region, 4, mode);
            let embed = new Discord.RichEmbed()
                .setTitle('Ranking: ' + username)
                .setDescription('Season:\t' + SeasonEnum.get(season) + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase())
                .setColor(0x00AE86)
                .setFooter(`https://pubg.op.gg/user/${username}?server=${region}`)
                .setTimestamp();
                
            if(soloData) {
                addEmbedFields(embed, 'Solo', soloData);
            } else {
                embed.addBlankField(false);
                embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
            }
            if(duoData) {
                addEmbedFields(embed, 'Duo', duoData);
            } else {
                embed.addBlankField(false);
                embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
            }
            if(squadData) {
                addEmbedFields(embed, 'Squad', squadData);
            } else {
                embed.addBlankField(false);
                embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
            }
                
            message.edit({embed});
        });
};

function addEmbedFields(embed, squadType, playerData) {
    embed.addBlankField(false)
        .addField(squadType + ' Rank / Rating / Top % / Grade', playerData.rank + ' / ' + playerData.rating + ' / ' + playerData.topPercent + ' / ' + playerData.grade, false)
        .addField('KD / KDA', playerData.kd + ' / ' + playerData.kda, true)
        .addField('Win %', playerData.winPercent, true)
        .addField('Top 10%', playerData.topTenPercent, true)
        .addField('Headshot Kill %', playerData.headshot_kills, true)
        .addField('Longest Kill', playerData.longest_kill, true)
        .addField('Average Damage', playerData.average_damage_dealt, true);
}    

async function checkParameters(msg, checkSeason, checkRegion, checkMode) {
    let errMessage = '';

    let validSeason = await scrape.isValidSeason(checkSeason);
    let validRegion = await scrape.isValidRegion(checkRegion);
    let validMode = await scrape.isValidMode(checkMode);
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

    if(!validSeason || !validRegion || !validMode) {
        cs.handleError(msg, errMessage, help);
        return false;
    }

    return true;
}

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
