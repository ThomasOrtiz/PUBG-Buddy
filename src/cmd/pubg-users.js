const Discord = require('discord.js');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg) {
    let embed = new Discord.RichEmbed()
        .setTitle('People added')
        .setColor(0x00AE86);

    let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.channel.id);
    console.log(msg.channel.id + ' has ' + registeredPlayers.length + ' registered users!');

    let players = '';
    for(let i = 0; i < registeredPlayers.length; i++) {
        let player = registeredPlayers[i];
        players += player.username + '\n';
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