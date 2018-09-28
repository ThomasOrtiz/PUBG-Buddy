import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.api.service';
import {
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService
} from '../../services/sql-services/sql.module';
import { Command, CommandConfiguration, CommandHelp, Server } from '../../models/models.module';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';


export class AddUser extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'addUser',
        description: 'Adds user(s) to the server\'s registery. ** Name is case sensitive **',
        usage: '<prefix>addUser <username ...> [region=]',
        examples: [
            '!pubg-addUser john',
            '!pubg-addUser john @DiscordMention',
            '!pubg-addUser jane region=pc-eu',
            '!pubg-addUser jane @DiscordMention region=pc-eu'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        if (!params[0]) {
            cs.handleError(msg, 'Error:: Must specify a username', this.help);
            return;
        }

        const serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        const region: string  = this.getRegion(params, serverDefaults.default_region);
        const mention: string = this.getMentionValue(params);

        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[region]);

        mixpanel.track(this.help.name, {
            distinct_id: msg.author.id,
            server_id: msg.guild.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            region: region
        });

        let temp: string = this.getUsernameWithSpaces(params);

        for(let i = 0; i < params.length; i++) {
            let username: string = params[i];

            if (username.indexOf('region=') >= 0){ continue; } // TODO: shouldn't need this anymore

            this.addUser(msg, api, region, username, mention);
        }
    }

    private getUsername(params: string[]): string {
        const userNameStartIndex: number = cs.isSubstringOfElement("username=", params);

        if(userNameStartIndex > 0) {
            return this.getUsernameWithSpaces(params);
        }
        return '';
    }

    private getUsernameWithSpaces(params: string[]): string {
        let username: string = '';

        const userNameStartIndex: number = cs.isSubstringOfElement("username=", params);
        let userNameEndIndex: number = -1;

        for(let i = userNameStartIndex+1; i < params.length; i++) {
            const param: string = params[i];
            let indexOfQuote: number = param.indexOf('"');

            if (indexOfQuote > 0 && indexOfQuote === param.length-1) {
                userNameEndIndex = i;
                break;
            }
        }

        // Construct name from params
        username = params[userNameStartIndex].slice(params[userNameStartIndex].indexOf('=') + 1);
        for(let i = userNameStartIndex+1; i <= userNameEndIndex; i++) {
            username += ` ${params[i]}`;
        }
        // Remove quotes
        username = username.substr(1);
        username = username.substr(0, username.length-1);

        // Remove 'name' parameters
        for(let i = userNameEndIndex; i >= userNameStartIndex; i--) {
            params.splice(i, 1);
        }

        return username;
    }

    private getRegion(params: string[], defaultRegion: string): string {
        const indexOfRegion = cs.isSubstringOfElement('region=', params);
        if (indexOfRegion < 0) {
            return undefined;
        }

        let region = cs.getParamValue('region=', params, defaultRegion).toUpperCase();

        params.splice(indexOfRegion, 1); // remove 'region=' value in the array

        return region;
    }

    private getMentionValue(params: string[]): string {
        const indexOfMention = cs.isSubstringOfElement('@', params);
        if (indexOfMention < 0) {
            return undefined;
        }

        let mention = params[1];
        mention = mention.substring(2, mention.indexOf('>'));

        params.splice(indexOfMention, 1); // remove '@id' value in the array

        return mention;
    }

    private async addUser(msg: Discord.Message, api: PubgAPI, region: string, username: string, mention: string) {
        const message: Discord.Message = await msg.channel.send(`Checking for \`${username}\`'s PUBG Id ... give me a second`) as Discord.Message;
        const pubgId: string = await pubgService.getPlayerId(api, username);

        if (pubgId) {
            const registered: boolean = await sqlServerRegisteryService.registerUserToServer(pubgId, message.guild.id, mention);
            if (registered) {
                message.edit(`Added \`${username}\``);
            } else {
                message.edit(`Could not add \`${username}\``);
            }
        } else {
            message.edit(`Could not find \`${username}\` on the \`${region}\` region. Double check the username and region.`);
        }
    }

}
