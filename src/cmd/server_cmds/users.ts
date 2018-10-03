import * as Discord from 'discord.js';
import { SqlServerRegisteryService as sqlServerRegisteryService } from '../../services/sql-services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Player } from '../../interfaces';
import { AnalyticsService as analyticsService } from '../../services/analytics.service';


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
        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length
        });

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

