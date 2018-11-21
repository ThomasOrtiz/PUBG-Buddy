import * as Discord from 'discord.js';
import {
    AnalyticsService,
    DiscordMessageService,
    ParameterService,
    PubgPlayerService,
    SqlServerService,
    SqlServerRegisteryService,
    PubgPlatformService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { IServer, PubgParameters, IPlayer } from '../../interfaces';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';


export class RemoveUser extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'removeUser',
        description: 'Removes a user from the server\'s registery. **Name is case sensitive**',
        usage: '<prefix>removeUser <username ...> [region=]',
        examples: [
            '!pubg-removeUser john',
            '!pubg-removeUser "Player A"',
            '!pubg-removeUser john region=pc-na'
        ]
    };

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            DiscordMessageService.handleError(msg, 'Error:: Must specify at least one username', this.help);
            return;
        }

        const serverDefaults: IServer = await SqlServerService.getServer(msg.guild.id);
        const pubg_params: PubgParameters = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[pubg_params.region]);

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            region: pubg_params.region
        });

        this.removeUser(msg, api, pubg_params.region, pubg_params.username);
    };

    private async removeUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Removing **${username}** from server registry`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (!pubgId) {
            message.edit(`Could not find **${username}** on the **${region}** region. Double check the username and region.`);
            return;
        }

        let unregistered: boolean = await SqlServerRegisteryService.unRegisterUserToServer(pubgId, message.guild.id);
        if (unregistered) {
            const registeredPlayers: IPlayer[] = await SqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
            const registeredPlayersStr: string = this.getPlayerString(registeredPlayers);

            const embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle(registeredPlayers.length + ' Registered Users')
                .setColor('F2A900')
                .addField('Players', registeredPlayersStr, true)
                .addBlankField(true);
            message.edit(`Removed **${username}**`, {embed});
        }
        else {
            message.edit(`**${username}** does not exist on server registery`);
        }
    }

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
