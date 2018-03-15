const Discord = require('discord.js');
const cs = require('../services/common.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    let prefix = cs.getParamValue('prefix=', params, false);
    let season = cs.getParamValue('season=', params, false);
    let region = cs.getParamValue('region=', params, false);
    let mode = cs.getParamValue('mode=', params, false);
    let squadSize = +cs.getParamValue('squadSize=', params, false);

    if(!prefix || !season || !region || !mode || !squadSize) {
        msg.channel.send('Error: Must specify all parameters - Usage: ' + help.usage);   
        return;
    }

    msg.channel.send('Updating this server\'s pubg defaults: prefix=' + prefix + ' season=' + season + ' region=' + region + ' mode=' + mode + ' squadSize=' + squadSize)
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
                        .addField('Default Squad Size', server.default_squadsize, true);
                    msg.edit({embed});
                });
        });
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 4
};

let help = exports.help = {
    name: 'setServerDefaults',
    description: 'Set the server defaults for pubg commands. Only usable by users with administrator permissions.',
    usage: '<prefix>setServerDefaults <season=(2018-01 | 2018-02 | 2018-03)> <region=(na | as | kr/jp | kakao | sa | eu | oc | sea)> <squadSize=(1 | 2 | 4)> <mode=(fpp | tpp)>',
    examples: [
        '!pubg-setServerDefaults season=2018-03 region=na squadSize=4 mode=tpp',
    ]
};