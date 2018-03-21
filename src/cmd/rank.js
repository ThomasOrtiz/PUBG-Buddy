const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');
const SeasonEnum = require('../models/seasons.enum');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        handleError(msg, 'Must specify a username');
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

    let seasonId = SeasonEnum[season] || season;
    if(!checkParameters(msg, seasonId, region, mode)) {
        return;
    }
    
    msg.channel.send('Getting data for ' + username)
        .then(async (message) => {
            let id = await scrape.getCharacterID(username);
            if(!id) {
                message.edit('Invalid username: ' + username);
                return;
            }
            let soloData = await scrape.getPUBGCharacterData(id, username, seasonId, region, 1, mode);
            let duoData = await scrape.getPUBGCharacterData(id, username, seasonId, region, 2, mode);
            let squadData = await scrape.getPUBGCharacterData(id, username, seasonId, region, 4, mode);
            let embed = new Discord.RichEmbed()
                .setTitle('Ranking: ' + username)
                .setDescription('Season:\t' + season + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase())
                .setColor(0x00AE86)
                .setFooter('Retrieved from https://pubg.op.gg/' + username + '?server=' + region)
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

function handleError(msg, errMessage) {
    msg.channel.send(`Error:: ${errMessage}\n\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`, { code: 'asciidoc'});
}

function checkParameters(msg, checkSeason, checkRegion, checkMode) {
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