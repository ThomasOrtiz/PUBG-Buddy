import * as Discord from 'discord.js';
import { AnalyticsService, SqlServerRegisteryService } from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { IPlayer } from '../../interfaces';


export class Users extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'users',
        description: 'List all users on the server\'s registery.',
        usage: '<prefix>users',
        examples: [
            '!pubg-users'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length
        });

        const registeredPlayers: IPlayer[] = await SqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        const registeredPlayersStr: string = this.getPlayerString(registeredPlayers);

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(registeredPlayers.length + ' Registered Users')
            .setColor(0x00AE86)
            .addField('Players', registeredPlayersStr, true)
            .addBlankField(true);

        msg.channel.send({ embed });
    };

    private getPlayerString(registeredPlayers: IPlayer[]): string {
        let players: string = '';

        for (let i = 0; i < registeredPlayers.length; i++) {
            const player: IPlayer = registeredPlayers[i];
            players += `${i + 1}.\t **${player.username}** [${player.platform}]\n`;
        }

        if (players === '') {
            players = 'No users registered yes. Use `<prefix>addUser <username>`';
        }

        return players;
    }

}

