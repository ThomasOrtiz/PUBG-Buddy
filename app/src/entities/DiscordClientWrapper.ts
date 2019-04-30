
/**
 * Discord.JS recommended to create a wrapper client to fix build errors on heroku.
 * The build errors originated from accessing the below properties which do not exist
 * on the default Discord.Client.
 * Instead these properties are added on as a conveinence for handling commands.
 */


import * as Discord from 'discord.js';
import { Command } from '.';


export class DiscordClientWrapper extends Discord.Client {

    public aliases: Discord.Collection<any, any>;
    public commands: Discord.Collection<any, any>;

    public reload: (command: Command) => Promise<{}>;
    public elevation: (msg: Discord.Message) => number;

}
