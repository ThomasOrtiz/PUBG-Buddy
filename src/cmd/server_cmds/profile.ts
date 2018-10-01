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
            '!pubg-profile',
            '!pubg-profile [@Discord_Mention]'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let discordId: string;
        let usedMention: boolean = false;

        if (params.length > 0) {
            let mention: string = params[0];
            discordId = mention.substring(2, mention.length-1);
            usedMention = true;
        } else {
            discordId = msg.author.id;
        }

        let username: string = await SqlUserRegisteryService.getUserProfile(discordId);

        if (!username && !usedMention) {
            msg.channel.send(`You haven't registered yet -- run \`register\`.`);
            return;
        } else if (!username && usedMention) {
            msg.channel.send(`That user hasn't registered yet -- ask them run \`register\`.`);
            return;
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
