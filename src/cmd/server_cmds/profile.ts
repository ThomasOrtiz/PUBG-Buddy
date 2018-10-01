import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import {
    SqlUserRegisteryService
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';


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
            '!pubg-profile'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let username: string = await SqlUserRegisteryService.getUserProfile(msg.author.id);

        if(!username) {
            msg.channel.send(`You haven't registered a user yet -- run \`register\`.`);
        }

        mixpanel.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            pubg_name: username
        });

        const date: Date = msg.author.createdAt;
        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle(`\`${msg.author.tag}\`'s profile`)
            .setThumbnail(msg.author.displayAvatarURL)
            .setColor(0x00AE86)
            .addField('Joined Discord', `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`)
            .addField('PUBG Username', username)
            .setTimestamp();

        msg.channel.send({embed})
    }

}
