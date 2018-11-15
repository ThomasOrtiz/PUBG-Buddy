import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    PubgPlayerService,
    SqlServerService as sqlServerService,
    SqlUserRegisteryService as sqlUserRegisteryService,
    ParameterService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgParameters } from '../../interfaces';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';


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

        analyticsService.track(this.help.name, {
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
            const serverDefaults = await sqlServerService.getServer(msg.guild.id);
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        } else {
            pubg_params = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, true);
        }

        // Throw error if no username supplied
        if (!pubg_params.username) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username.', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            username: pubg_params.username,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
        }

        analyticsService.track(this.help.name, {
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
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const message: Discord.Message = await msg.channel.send(`Checking for **${username}**'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await PubgPlayerService.getPlayerId(api, username);

        if (pubgId && pubgId !== '') {
            const registered: boolean = await sqlUserRegisteryService.registerUser(msg.author.id, pubgId);
            if (registered) {
                const user: Discord.User = msg.author;
                const date: Date = user.createdAt;
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
                    .setTitle(`**${user.tag}**'s profile`)
                    .setThumbnail(user.displayAvatarURL)
                    .setColor(0x00AE86)
                    .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
                    .addField('PUBG Username', username)
                    .setTimestamp();

                message.edit({embed});
            } else {
                message.edit(`Failed to register your Discord user with PUBG name **${username}**`);
            }
        } else {
            message.edit(`Could not find **${username}** on the **${region}** region. Double check the username and region.`);
        }
    }

}
