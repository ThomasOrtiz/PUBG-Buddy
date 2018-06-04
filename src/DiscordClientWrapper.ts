
/**
 * Discord.JS recommended to create a wrapper client to fix build errors on heroku.
 * The build errors originated from accessing the below properties. Adding this wrapper
 * client that extends Discord.Client and using it allows  the compiler issues to be ignored
 * and the build to pass.
 *
 * Weird
 */


import * as Discord from 'discord.js';


export class DiscordClientWrapper extends Discord.Client {
    aliases: any;
    commands: any;
    channel: any;
    elevation(arg0: any): any {};
    reload: (command: any) => Promise<{}>;
}
