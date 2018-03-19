const Discord = require('discord.js');
const cs = require('../services/common.service');
const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');
const SeasonEnum = require('../models/seasons.enum');

exports.run = async (bot, msg, params) => {
    let prefix = cs.getParamValue('prefix=', params, false);
    let season = cs.getParamValue('season=', params, false);
    let region = cs.getParamValue('region=', params, false);
    let mode = cs.getParamValue('mode=', params, false);
    let squadSize = +cs.getParamValue('squadSize=', params, false);

    if(!prefix || !season || !region || !mode || !squadSize) {
        handleError(msg, 'Must specify all parameters');
        return;
    }

    let seasonId = SeasonEnum[season] || season;
    if(!checkParameters(msg, prefix, seasonId, region, mode, squadSize)) {
        return;
    }

    msg.channel.send('Updating this server\'s pubg defaults ...')
        .then(async (msg) => {
            sql.setServerDefaults(msg.guild.id, prefix, season, region, mode, squadSize)
                .then(async () => {
                    let server = await sql.getServerDefaults(msg.guild.id);
                    let embed = new Discord.RichEmbed()
                        .setTitle('Server Defaults')
                        .setDescription('The defaults that a server has when running PUBG Bot commands.')
                        .setColor(0x00AE86)
                        .addField('Bot Prefix', server.default_bot_prefix, true)
                        .addBlankField(true)
                        .addBlankField(true)
                        .addBlankField(false)
                        .addField('Default Season', server.default_season, true)
                        .addField('Default Region', server.default_region, true)
                        .addField('Default Mode', server.default_mode, true)
                        .addField('Default Squad Size', server.default_squadSize, true);
                    msg.edit({embed});
                });
        });
};

function handleError(msg, errMessage) {
    msg.channel.send(`Error:: ${errMessage}\n\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`, { code: 'asciidoc'});
}

function checkParameters(msg, prefix, checkSeason, checkRegion, checkMode, checkSquadSize) {
    if(prefix.length === 0) {
        handleError(msg, 'Custom prefix can\'t be empty')
    }
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
    permLevel: 4
};

let help = exports.help = {
    name: 'setServerDefaults',
    description: 'Set the server defaults for pubg commands. Only usable by users with administrator permissions.',
    usage: '<prefix>setServerDefaults <prefix=[prefix]> <season=(2018-01 | 2018-02 | 2018-03)> <region=(na | as | kr/jp | kakao | sa | eu | oc | sea)> <squadSize=(1 | 2 | 4)> <mode=(fpp | tpp)>',
    examples: [
        '!pubg-setServerDefaults prefix=!pubg- season=2018-03 region=na squadSize=4 mode=tpp',
    ]
};