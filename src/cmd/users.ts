import * as Discord from 'discord.js';
import { SqlServerRegisteryService as sqlServerRegisteryService } from '../services/sql.service';
import { Player } from '../models/player';

exports.run = async (bot, msg) => {
    let registeredPlayers: Player[] = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);

    let players: string = '';
    for(let i = 0; i < registeredPlayers.length; i++) {
        let player = registeredPlayers[i];
        players += (i+1) + '.\t' + player.username + '\n';
    }

    if(players === '') {
        players = 'No users registered yes. Use `<prefix>addUser <username>`';
    }

    let embed = new Discord.RichEmbed()
        .setTitle(registeredPlayers.length + ' Registered Users')
        .setColor(0x00AE86)
        .addField('Players', players, true)
        .addBlankField(true);

    msg.channel.send({ embed });
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'users',
    description: 'List all users on this server\'s registery.',
    usage: '<prefix>users',
    examples: [
        '!pubg-users'
    ]
};
