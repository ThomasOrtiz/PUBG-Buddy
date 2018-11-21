import * as Discord from 'discord.js';
import { AnalyticsService, SqlUserRegisteryService } from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { IPlayer } from '../../interfaces';


export class Profile extends Command {

    conf: CommandConfiguration = {
        group: 'User',
        enabled: true,
        guildOnly: false,
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
            const mention: string = params[0];
            discordId = mention.substring(2, mention.length-1);
            usedMention = true;
            if (usedMention && !msg.guild) {
                msg.channel.send(`Mentions are not supported in direct messages.`);
                return;
            }
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

        const player: IPlayer = await SqlUserRegisteryService.getRegisteredUser(discordId);

        if (!player && !player.username && !usedMention) {
            msg.channel.send(`You haven't registered yet -- run \`register\`.`);
            return;
        } else if (!player && !player.username && usedMention) {
            msg.channel.send(`That user hasn't registered yet -- ask them run \`register\`.`);
            return;
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            pubg_name: player.username
        });

        const date: Date = user.createdAt;
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`**${user.tag}**'s profile`)
            .setThumbnail(user.displayAvatarURL)
            .setColor('F2A900')
            .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
            .addField('PUBG Username', player.username, true)
            .addField('Platform', player.platform, true)
            .setTimestamp();

        msg.channel.send({embed});
    }

}
