import * as Discord from 'discord.js';


export class DiscordClientWrapper extends Discord.Client {
    aliases: any;
    commands: any;
    channel: any;
    elevation(arg0: any): any {};
    reload: (command: any) => Promise<{}>;
}
