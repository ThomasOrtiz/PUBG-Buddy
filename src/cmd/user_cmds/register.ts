import * as Discord from 'discord.js';
import {
    AnalyticsService,
    DiscordMessageService,
    PubgPlayerService,
    SqlServerService,
    SqlUserRegisteryService,
    ParameterService,
    PubgPlatformService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgParameters, IPlayer } from '../../interfaces';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';


interface ParameterMap {
    username: string;
    region: string;
}

export class Register extends Command {

    conf: CommandConfiguration = {
        group: 'User',
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'register',
        description: 'Register a Discord User with a PUBG username - **Name is case sensitive**',
        usage: '<prefix>register <username ...> [region=]',
        examples: [
            '!pubg-register john',
            '!pubg-register "Player A"',
            '!pubg-register jane region=pc-eu'
        ]
    }

    private paramMap: ParameterMap;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            pubg_name: this.paramMap.username,
            region: this.paramMap.region
        });

        this.registerUser(msg, this.paramMap.region, this.paramMap.username);
    }

    private async getParameters(msg: Discord.Message, params: string[]) {
        let paramMap: ParameterMap;

        let pubg_params: PubgParameters;
        if (msg.guild) {
            const serverDefaults = await SqlServerService.getServer(msg.guild.id);
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        } else {
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true);
        }

        // Throw error if no username supplied
        if (!pubg_params.username) {
            DiscordMessageService.handleError(msg, 'Error:: Must specify a username.', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            username: pubg_params.username,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: paramMap.username,
            region: paramMap.region,
        });

        return paramMap;
    }

    private async registerUser(msg: Discord.Message, region: string, username: string) {
        const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[this.paramMap.region]);
        const message: Discord.Message = await msg.channel.send(`Checking for **${username}**'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (!pubgId) {
            message.edit(`Could not find **${username}** on the **${region}** region. Double check the username and region.`);
            return;
        }

        let registered: boolean = false;
        try {
            registered = await SqlUserRegisteryService.registerUser(msg.author.id, pubgId);
        } catch (e) {
            registered = false;
        }

        if (registered) {
            const player: IPlayer = await SqlUserRegisteryService.getRegisteredUser(msg.author.id);

            const user: Discord.User = msg.author;
            const date: Date = user.createdAt;
            const embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle(`**${user.tag}**'s profile`)
                .setThumbnail(user.displayAvatarURL)
                .setColor('F2A900')
                .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
                .addField('PUBG Username', player.username, true)
                .addField('Platform', player.platform, true)
                .setTimestamp();

            message.edit({embed});
        } else {
            message.edit(`Failed to register your Discord user with PUBG name **${username}**`);
        }

    }

}
