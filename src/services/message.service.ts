import * as Discord from 'discord.js';


export class DiscordMessageService {

    constructor() {}

    /**
     * Handles a command error and sends an error message.
     *
     * @param {Discord.Message} msg: Discord.Message
     * @param {string} errMessage: error string
     * @param {obj} help: command help object
     */
    static handleError(msg: Discord.Message, errMessage: string, help: any): void {
        let message = `${errMessage}\n`;
        if(help) {
            message += `\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e => `${e}`).join('\n')}`;
        }
        msg.channel.send(message, { code: 'asciidoc'});
    }

    /**
     * Creates a base embed
     *
     * @returns {Discord.RichEmbed} a new RichEmbed with basic information
     */
    static createBaseEmbed(title?: string, description?: string, color?: any, footer?: string, setTimeStamp: boolean = false): Discord.RichEmbed {
        const embed: Discord.RichEmbed = new Discord.RichEmbed()

        if(title) { embed.setTitle(title); }
        if(description) { embed.setDescription(description); }
        if(color) { embed.setColor(color); }
        if(footer) { embed.setFooter(footer); }
        if(setTimeStamp) { embed.setTimestamp(); }

        return embed;
    }

}
