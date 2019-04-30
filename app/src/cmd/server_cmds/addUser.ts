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


export class AddUser extends Command {

    conf: CommandConfiguration = {
        group: 'Server',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'addUser',
        description: 'Adds a user to the server\'s registery. **Name is case sensitive**',
        usage: '<prefix>addUser <username> [region=]',
        examples: [
            '!pubg-addUser john',
            '!pubg-addUser "Player A"',
            '!pubg-addUser john region=pc-eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            DiscordMessageService.handleError(msg, 'Error:: Must specify a username', this.help);
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
            pubg_name: pubg_params.username,
            region: pubg_params.region
        });

        this.addUser(msg, api, pubg_params.region, pubg_params.username);
    }

    private async addUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Checking for **${username}**'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (!pubgId) {
            message.edit(`Could not find **${username}** on the **${region}** region. Double check the username and region.`);
            return;
        }

        const registered: boolean = await SqlServerRegisteryService.registerUserToServer(pubgId, message.guild.id);
        if (registered) {
            const registeredPlayers: IPlayer[] = await SqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
            const registeredPlayersStr: string = this.getPlayerString(registeredPlayers);

            const embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle(registeredPlayers.length + ' Registered Users')
                .setColor('F2A900')
                .addField('Players', registeredPlayersStr, true)
                .addBlankField(true);
            message.edit(`Added **${username}**`, {embed});
        } else {
            message.edit(`Could not add **${username}**`);
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
