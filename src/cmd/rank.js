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
                embed.addBlankField(false)
                    .addField('Solo Rank / Rating / Top % / Grade', soloData.rank + ' / ' + soloData.rating + ' / ' + soloData.topPercent + ' / ' + soloData.grade, false)
                    .addField('KD / KDA', soloData.kd + ' / ' + soloData.kda, true)
                    .addField('Win %', soloData.winPercent, true)
                    .addField('Top 10%', soloData.topTenPercent, true)
                    .addField('Headshot Kill %', soloData.headshot_kills, true)
                    .addField('Longest Kill', soloData.longest_kill, true)
                    .addField('Average Damage', soloData.average_damage_dealt, true);
            } else {
                embed.addBlankField(false);
                embed.addField('Solo Status', 'Player hasn\'t played solo games this season', false);
            }
            if(duoData) {
                embed.addBlankField(false)
                    .addField('Duo Rank / Rating / Top % / Grade', duoData.rank + ' / ' + duoData.rating + ' / ' + duoData.topPercent + ' / ' + duoData.grade, false)
                    .addField('KD / KDA', duoData.kd + ' / ' + duoData.kda, true)
                    .addField('Win %', duoData.winPercent, true)
                    .addField('Top 10%', duoData.topTenPercent, true)
                    .addField('Headshot Kill %', duoData.headshot_kills, true)
                    .addField('Longest Kill', duoData.longest_kill, true)
                    .addField('Average Damage', duoData.average_damage_dealt, true);
            } else {
                embed.addBlankField(false);
                embed.addField('Duo Status', 'Player hasn\'t played duo games this season', false);
            }
            if(squadData) {
                embed.addBlankField(false)
                    .addField('Squad Rank / Rating / Top % / Grade', squadData.rank + ' / ' + squadData.rating + ' / ' + squadData.topPercent + ' / ' + squadData.grade, false)
                    .addField('KD / KDA', squadData.kd + ' / ' + squadData.kda, true)
                    .addField('Win %', squadData.winPercent, true)
                    .addField('Top 10%', squadData.topTenPercent, true)
                    .addField('Headshot Kill %', squadData.headshot_kills, true)
                    .addField('Longest Kill', squadData.longest_kill, true)
                    .addField('Average Damage', squadData.average_damage_dealt, true);
            } else {
                embed.addBlankField(false);
                embed.addField('Squad Stats', 'Player hasn\'t played squad games this season', false);
            }
                
            message.edit({embed});
        });
};

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