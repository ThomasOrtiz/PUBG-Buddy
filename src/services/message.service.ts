import * as Discord from 'discord.js';


export class DiscordMessageService {

    /**
     * Handles a command error and sends an error message.
     *
     * @param {Discord.Message} msg: Discord.Message
     * @param {string} errMessage: error string
     * @param {obj} help: command help object
     */
    static handleError(msg: Discord.Message, errMessage: string, help: any): void {
        let message = `${errMessage}\n`;
        if (help) {
            message += `\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e => `${e}`).join('\n')}`;
        }
        msg.channel.send(message, { code: 'asciidoc' });
    }

    /**
     * Creates a base embed
     *
     * @returns {Discord.RichEmbed} a new RichEmbed with basic information
     */
    static createBaseEmbed(title?: string, description?: string, color?: any, footer?: string, setTimeStamp: boolean = false): Discord.RichEmbed {
        const embed: Discord.RichEmbed = new Discord.RichEmbed()

        if (title) { embed.setTitle(title); }
        if (description) { embed.setDescription(description); }
        if (color) { embed.setColor(color); }
        if (footer) { embed.setFooter(footer); }
        if (setTimeStamp) { embed.setTimestamp(); }

        return embed;
    }

    static async setupReactions(msg: Discord.Message, originalPoster: Discord.User, onOneCollect: Function, onTwoCollect: Function, onFourCollect: Function): Promise<void> {
        const reaction_numbers = ["\u0030\u20E3", "\u0031\u20E3", "\u0032\u20E3", "\u0033\u20E3", "\u0034\u20E3", "\u0035\u20E3", "\u0036\u20E3", "\u0037\u20E3", "\u0038\u20E3", "\u0039\u20E3"]
        await msg.react(reaction_numbers[1]);
        await msg.react(reaction_numbers[2]);
        await msg.react(reaction_numbers[4]);

        const one_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[1] && originalPoster.id === user.id;
        const two_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[2] && originalPoster.id === user.id;
        const four_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[4] && originalPoster.id === user.id;

        const one_collector: Discord.ReactionCollector = msg.createReactionCollector(one_filter, { time: 15 * 1000 });
        const two_collector: Discord.ReactionCollector = msg.createReactionCollector(two_filter, { time: 15 * 1000 });
        const four_collector: Discord.ReactionCollector = msg.createReactionCollector(four_filter, { time: 15 * 1000 });

        one_collector.on('collect', onOneCollect);
        two_collector.on('collect', onTwoCollect);
        four_collector.on('collect', onFourCollect);

        one_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => {
                msg.edit('');
            });
        });
        two_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => {
                msg.edit('');
            });
        });
        four_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => {
                msg.edit('');
            });
        });
    }

}
