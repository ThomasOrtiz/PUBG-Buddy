const Discord = require('discord.js');
const cache = require('../caching');

exports.run = run;

async function run(bot, msg) {
    let embed = new Discord.RichEmbed()
        .setTitle('People added')
        .setColor(0x00AE86);

    let userToIdMapping = await cache.getUserToIdCache();

    let players = '';
    for (let key in userToIdMapping) {
        players += key + '\n';
    }
    
    if(players === '') {
        players = 'No users registered yes. Use `pubg-addUser <username>`';
    }
    

    embed
        .addField('Players', players, true)
        .addBlankField(true);

    msg.channel.send({ embed });
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-users',
    description: 'List all tracked users.',
    usage: 'pubg-users'
};