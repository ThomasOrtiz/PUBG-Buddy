import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
    DiscordMessageService as discordMessageService
 } from '../../services';
import { CommonMessages } from '../../shared/constants';


export class RandomDrop extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'drop',
        description: 'Gives you a random place to drop dependant on the map.',
        usage: '<prefix>drop [(e | m | s)]',
        examples: [
            '!pubg-drop e',
            '!pubg-drop m',
            '!pubg-drop s',
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let map: string;

        try {
            map = await this.getParameters(msg, params);
        } catch { return; }

        let response: Discord.Message;

        const explanation: string = `**${msg.author.username}**, use the **E**, **M**, and **S** **reactions** to switch between **Erangel**, **Miramar**, and **Sanhok**.`;
        if (map) {
            const drop: string = this.getDrop(map);
            response = await msg.channel.send(`${explanation}\nDrop **${drop}**!`) as Discord.Message;
        } else {
            response = await msg.channel.send(`${explanation}`) as Discord.Message;
        }

        this.setupReactions(response, msg.author);

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });
    };

    private getDrop(map: string): string {
        let randomDrop;
        switch (map) {
            case 'e': {
                randomDrop = this.getRandomErangel();
                break;
            }
            case 'm': {
                randomDrop = this.getRandomMiramar();
                break;
            }
            case 's': {
                randomDrop = this.getRandomSanhok();
                break;
            }
        }

        return randomDrop;
    }

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<string> {
        let map: string = '';

        if (params.length > 0) {
            map = params[0].toLowerCase();
            if (map !== 'e' && map !== 'm' && map !== 's') {
                discordMessageService.handleError(msg, 'Error:: Must specify a map name', this.help);
                throw 'Error:: Must use "e", "m", or "s"';
            }

            return map;
        }

        return undefined;
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User): Promise<void> {
        const reaction_numbers = ['🇪', '🇲', '🇸']
        await msg.react(reaction_numbers[0]);
        await msg.react(reaction_numbers[1]);
        await msg.react(reaction_numbers[2]);

        const e_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[0] && originalPoster.id === user.id;
        const m_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[1] && originalPoster.id === user.id;
        const s_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[2] && originalPoster.id === user.id;

        const e_collector: Discord.ReactionCollector = msg.createReactionCollector(e_filter, { time: 15 * 1000 });
        const m_collector: Discord.ReactionCollector = msg.createReactionCollector(m_filter, { time: 15 * 1000 });
        const s_collector: Discord.ReactionCollector = msg.createReactionCollector(s_filter, { time: 15 * 1000 });

        const explanation: string = `**${originalPoster.username}**, use the **E**, **M**, and **S** **reactions** to switch between **Erangel**, **Miramar**, and **Sanhok**.`;
        let drop: string = '';

        e_collector.on('collect', async (reaction: Discord.MessageReaction) => {
            drop = this.getDrop('e');

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch((err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            await msg.edit(`${warningMessage}${explanation}\nDrop **${drop}**`) as Discord.Message;
        });
        m_collector.on('collect', async (reaction: Discord.MessageReaction) => {
            drop = this.getDrop('m');

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch((err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            await msg.edit(`${warningMessage}${explanation}\nDrop **${drop}**`) as Discord.Message;
        });
        s_collector.on('collect', async (reaction: Discord.MessageReaction) => {
            drop = this.getDrop('s');

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch((err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            await msg.edit(`${warningMessage}${explanation}\nDrop **${drop}**`) as Discord.Message;
        });

        e_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => { msg.edit(`Have a good drop${drop ? ` at **${drop}**` : '!'}`); });
        });
        m_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => { msg.edit(`Have a good drop${drop ? ` at **${drop}**` : '!'}`); });
        });
        s_collector.on('end', collected => {
            msg.clearReactions().catch(() => { }).then(() => { msg.edit(`Have a good drop${drop ? ` at **${drop}**` : '!'}`); });
        });
    }

    private getRandomErangel(): string {
        let drops: string[] = [
            'Apartments (EL)',
            'Farm (FM)',
            'Ferry Pier (CN)',
            'Gatka (CL)',
            'Georgopol (BK)',
            'Hospital (BL)',
            'Lipovka (GL)',
            'Mansion (GK)',
            'Military Base (EO)',
            'Mylta (FM)',
            'Mylta Power (HM)',
            'Mylta Power Factory (GM)',
            'Kameshki (GI)',
            'Pochinki (DL)',
            'Primorsk (BN)',
            'Quarry (BN)',
            'Rozhok (DK)',
            'Ruins (DL)',
            'School (EL)',
            'Shelter (FL)',
            'Shooting Range (DJ)',
            'Stalber (FJ)',
            'Stalber Warehouse (FJ)',
            'Novorepnoye (FN)',
            'Novorepnoye Radio (FO)',
            'Water Town (DL)',
            'Woodcutter Camp (GM)',
            'Yasnaya Polyana (FK)',
            'Zharki (BJ)'
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomMiramar(): string {
        let drops: string[] = [
            'Alcantara (AJ)',
            'Campo Militar (GI)',
            'Chumacera (CN)',
            'Crater Fields (BK/CK)',
            'Cruz Del Valle (FJ)',
            'El Azahar (GK)',
            'El Pozo (BK)',
            'Graveyard (EL)',
            'Hacienda Del Patron (EK)',
            'Impala (GM)',
            'Islands (HM/HN)',
            'Junkyard (FL)',
            'La Bendita (EM)',
            'La Cobreria (CJ)',
            'Ladrillera (BM)',
            'Los Higos (CP)',
            'Los Leones (EN)',
            'Minas Generales (FL)',
            'Monte Nuevo (BL)',
            'Oasis (DI)',
            'Pecado (DM)',
            'Power Grid (DL)',
            'Prison (AP)',
            'Puerto Paraiso (GO)',
            'Ruins (AJ)',
            'San Martin (DK)',
            'Tierra Bronca (GJ)',
            'Torre Ahumada (FI)',
            'Trailer Park (AJ)',
            'Valle Del Mar (BN)',
            'Water Treatment (EJ)'
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomSanhok(): string {
        let drops: string[] = [
            'Ban Tai (CL)',
            'Bhan (CJ)',
            'Bootcamp (BJ)',
            'Bottom of East Island',
            'Camp Alpha (AJ)',
            'Camp Bravo (DJ)',
            'Camp Charlie (CL)',
            'Cave (CK)',
            'Docks (DL)',
            'Ha Tinh (BJ)',
            'Kampong (DK)',
            'Khao (CI)',
            'Lakawi (DK)',
            'Mountain (BJ)',
            'Mongnai (DI)',
            'Na Kham (BL)',
            'North-West Island',
            'Pai Nan (BK)',
            'Paradise Resort (CJ)',
            'Quarry (CK)',
            'Ruins (BK)',
            'Sahmee (BL)',
            'South-West Island',
            'Tambang (AK)',
            'Tat Mok (CI)',
            'Top of East Island',
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }
}
