import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    PubgService as pubgService,
    DiscordMessageService as discordMessageService,
    SqlServerService as sqlServerService,
    SqlUserRegisteryService as sqlUserRegisteryService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Server } from '../../interfaces';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';


export class Register extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'register',
        description: 'Register a Discord User with a PUBG username - ** Name is case sensitive **',
        usage: '<prefix>register <username ...> [region=]',
        examples: [
            '!pubg-register john',
            '!pubg-register jane',
            '!pubg-register jane region=eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const region: string  = cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase();
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[region]);
        const username: string = params[0];

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            pubg_name: username,
            number_parameters: params.length,
            region: region
        });

        this.registerUser(msg, api, region, username);
    }

    private async registerUser(msg: Discord.Message, api: PubgAPI, region: string, username: string) {
        const message: Discord.Message = await msg.channel.send(`Checking for ${username}'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await pubgService.getPlayerId(api, username);

        if (pubgId && pubgId !== '') {
            const registered: boolean = await sqlUserRegisteryService.registerUser(msg.author.id, pubgId);
            if (registered) {
                const user: Discord.User = msg.author;
                const date: Date = user.createdAt;
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
                    .setTitle(`\`${user.tag}\`'s profile`)
                    .setThumbnail(user.displayAvatarURL)
                    .setColor(0x00AE86)
                    .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
                    .addField('PUBG Username', username)
                    .setTimestamp();

                message.edit({embed});
            } else {
                message.edit(`Failed to register your Discord user with PUBG name \`${username}\``);
            }
        } else {
            message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
        }
    }

}
