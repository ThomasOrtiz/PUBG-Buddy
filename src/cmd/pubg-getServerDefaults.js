const Discord = require('discord.js');
const sql = require('../sql.service');
require('dotenv').config();

exports.run = run;
async function run(bot, msg) {
    msg.channel.send('Getting server defaults ...')
        .then(async (message) => {
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
            message.edit({embed});
        });
}

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-getServerDefaults',
    description: 'Get the server defaults for pubg commands.',
    usage: 'pubg-getServerDefaults'
};