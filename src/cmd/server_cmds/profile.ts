import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    SqlUserRegisteryService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';


export class Profile extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'profile',
        description: `Shows the Discord User's profile`,
        usage: '<prefix>profile',
        examples: [
            '!pubg-profile',
            '!pubg-profile [@Discord_Mention]'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let discordId: string;
        let usedMention: boolean = false;

        let user: Discord.User;
        if (params.length > 0) {
            let mention: string = params[0];
            discordId = mention.substring(2, mention.length-1);
            usedMention = true;
            try {
                user = await bot.fetchUser(discordId);
            } catch(e) {
                msg.channel.send(`You must use a Discord Mention as a parameter.`);
                return;
            }

        } else {
            discordId = msg.author.id;
            user = msg.author;
        }

        let pubg_name: string = await SqlUserRegisteryService.getRegisteredUser(discordId);

        if (!pubg_name && !usedMention) {
            msg.channel.send(`You haven't registered yet -- run \`register\`.`);
            return;
        } else if (!pubg_name && usedMention) {
            msg.channel.send(`That user hasn't registered yet -- ask them run \`register\`.`);
            return;
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            pubg_name: pubg_name
        });

        const date: Date = user.createdAt;
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`\`${user.tag}\`'s profile`)
            .setThumbnail(user.displayAvatarURL)
            .setColor(0x00AE86)
            .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
            .addField('PUBG Username', pubg_name)
            .setTimestamp();

        msg.channel.send({embed});
    }

}
