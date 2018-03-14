const Discord = require('discord.js');
const sql = require('../sql.service');
require('dotenv').config();

exports.run = async (bot, msg, params) => {
    let prefix = getParamValue('prefix=', params, process.env.prefix);
    let season = getParamValue('season=', params, await sql.getLatestSeason());
    let region = getParamValue('region=', params, 'na');
    let mode = getParamValue('mode=', params, 'fpp');
    let squadSize = +getParamValue('squadSize=', params, 4);

    msg.channel.send('Updating this server\'s pubg defaults: prefix=' + prefix + ' season=' + season + ' region=' + region + ' mode=' + mode + ' squadSize=' + squadSize)
        .then(async (msg) => {
            sql.setServerDefaults(msg.guild.id, prefix, season, region, mode, squadSize)
                .then(async () => {
                    let server = await sql.getServerDefaults(msg.guild.id);
                    let embed = new Discord.RichEmbed()
                        .setTitle('Server Defaults')
                        .setDescription('The defaults that a server has when running PUBG Bot commands.')
                        .setColor(0x00AE86)
                        //.addField('Default Prefix', server.default_bot_prefix, true)
                        //.addBlankField(true)
                        //.addBlankField(true)
                        .addBlankField(false)
                        .addField('Default Season', server.default_season, true)
                        .addField('Default Region', server.default_region, true)
                        .addField('Default Mode', server.default_mode, true)
                        .addField('Default Squad Size', server.default_squadsize, true);
                    msg.edit({embed});
                });
        });
    

};

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
    guildOnly: true,
    aliases: [],
    permLevel: 4
};

exports.help = {
    name: 'pubg-setServerDefaults',
    description: 'Set the server defaults for pubg commands.',
    usage: 'pubg-setServerDefaults <season=[2018-01, 2018-02, 2018-03]> <region=[na, as, kr/jp, kakao, sa, eu, oc, sea]> <squadSize=#> <mode=[fpp || tpp]>'
};