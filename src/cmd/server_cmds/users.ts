import { DiscordClientWrapper } from './../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { SqlServerRegisteryService as sqlServerRegisteryService } from '../../services/sql.service';
import { Player } from '../../models/player';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class Users extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'users',
        description: 'List all users on this server\'s registery.',
        usage: '<prefix>users',
        examples: [
            '!pubg-users'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let registeredPlayers: Player[] = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        let players: string = '';
        for (let i = 0; i < registeredPlayers.length; i++) {
            const player: Player = registeredPlayers[i];
            players += (i + 1) + '.\t' + player.username + '\n';
        }
        if (players === '') {
            players = 'No users registered yes. Use `<prefix>addUser <username>`';
        }
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(registeredPlayers.length + ' Registered Users')
            .setColor(0x00AE86)
            .addField('Players', players, true)
            .addBlankField(true);
        msg.channel.send({ embed });
    };

}

