import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService,
    ImageService
} from '../../services';
import Jimp = require('jimp');
import { PubgMapImageLocation, FontLocation } from '../../shared/constants';

interface DropLocation {
    name: string;
    x: number;
    y: number;
}

export class Drop extends Command {
    conf: CommandConfiguration = {
        group: 'PUBG',
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'drop',
        description: 'Gives you a random place to drop.',
        usage: '<prefix>drop [(e | m | s)]',
        examples: [
            '!pubg-drop',
            '!pubg-drop e',
            '!pubg-drop m',
            '!pubg-drop s',
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let map: string = this.getParameters(params);

        let response: Discord.Message;
        const explanation: string = `**${msg.author.username}**, use the **E**, **M**, and **S** **reactions** to switch between **Erangel**, **Miramar**, and **Sanhok**.`;
        if (map) {
            let reply: Discord.Message = (await msg.channel.send('Finding a drop ...')) as Discord.Message;
            const drop: DropLocation = this.getDrop(map);
            const attatchment: Discord.Attachment = await this.createImage(map, drop);

            await reply.delete();
            response = (await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment)) as Discord.Message;
        } else {
            response = (await msg.channel.send(`${explanation}`)) as Discord.Message;
        }

        this.setupReactions(response, msg.author);

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag
        });
    }

    /**
     * Retrieves the paramters for the command
     * @param {string[]} params
     * @returns {string} map initial
     */
    private getParameters(params: string[]): string {
        let map: string = undefined;

        if (params.length === 0) { return map; }

        map = params[0].toLowerCase();
        if (map !== 'e' && map !== 'm' && map !== 's') {
            return undefined;
        }

        return map;
    }

    private async createImage(map: string, drop: DropLocation): Promise<Discord.Attachment> {
        let image: Jimp = (await ImageService.loadImage(this.getMapImage(map))).clone();

        const font: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_RED_OUTLINE_64);
        const textObj: any = {
            text: 'x',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        };

        const textWidth = Jimp.measureText(font, textObj.text);
        const textHeight = Jimp.measureTextHeight(font, textObj.text, textWidth);
        image.print(font, drop.x - textWidth / 2, drop.y - textHeight / 2, textObj);

        image.resize(512, 512);
        const imageBuffer: Buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new Discord.Attachment(imageBuffer);
    }

    private getMapImage(map: string): PubgMapImageLocation {
        switch (map) {
            case 'e': {
                return PubgMapImageLocation.ERANGEL;
            }
            case 'm': {
                return PubgMapImageLocation.MIRAMAR;
            }
            case 's': {
                return PubgMapImageLocation.SANHOK;
            }
        }
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User): Promise<void> {
        const reaction_numbers = ['🇪', '🇲', '🇸'];
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
        e_collector.on('collect', async () => {
            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = (await msg.channel.send('Finding a drop ...')) as Discord.Message;
            const drop: DropLocation = this.getDrop('e');
            const attatchment: Discord.Attachment = await this.createImage('e', drop);

            await reply.delete();
            const newMsg = (await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment)) as Discord.Message;
            this.setupReactions(newMsg, originalPoster);
        });
        m_collector.on('collect', async () => {
            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = (await msg.channel.send('Finding a drop ...')) as Discord.Message;
            const drop: DropLocation = this.getDrop('m');
            const attatchment: Discord.Attachment = await this.createImage('m', drop);

            await reply.delete();
            const newMsg = (await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment)) as Discord.Message;
            this.setupReactions(newMsg, originalPoster);
        });
        s_collector.on('collect', async () => {
            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = (await msg.channel.send('Finding a drop ...')) as Discord.Message;
            const drop: DropLocation = this.getDrop('s');
            const attatchment: Discord.Attachment = await this.createImage('s', drop);

            await reply.delete();
            const newMsg = (await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment)) as Discord.Message;
            this.setupReactions(newMsg, originalPoster);
        });

        e_collector.on('end', () => {
            msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {});});
        });
        m_collector.on('end', () => {
            msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {});});
        });
        s_collector.on('end', () => {
            msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {});});
        });
    }

    private getDrop(map: string): DropLocation {
        switch (map) {
            case 'e': {
                return this.getRandomErangel();
            }
            case 'm': {
                return this.getRandomMiramar();
            }
            case 's': {
                return this.getRandomSanhok();
            }
        }
    }

    private getRandomErangel(): DropLocation {
        let drops: DropLocation[] = [
            { name: "Apartments (EL)", x: 268.75, y: 203.75 },
            { name: "Farm (FM)", x: 332.5, y: 280 },
            { name: "Ferry Pier (CN)", x: 172.5, y: 345 },
            { name: "Gatka (CL)", x: 133.75, y: 241.25 },
            { name: "Georgopol North (BK)", x: 110, y: 132.5 },
            { name: "Georgopol Containers (BK)", x: 125, y: 171.25 },
            { name: "Georgopol South-West (BK)", x: 98.75, y: 173.75 },
            { name: "Hospital (BL)", x: 92.5, y: 193.75 },
            { name: "Lipovka (GL)", x: 431.75, y: 200.75 },
            { name: "Mansion (GK)", x: 379.5, y: 184.5 },
            { name: "Military Base (EO)", x: 273.75, y: 387.5 },
            { name: "Mylta (FM)", x: 366.25, y: 292 },
            { name: "Mylta Power (HM)", x: 443.75, y: 270 },
            { name: "Mylta Power Factory (GM)", x: 421.25, y: 282.5 },
            { name: "Kameshki (GI)", x: 407.5, y: 63.75 },
            { name: "Pochinki (DL)", x: 221.25, y: 247.5 },
            { name: "Primorsk (BN)", x: 98.75, y: 372.5 },
            { name: "Quarry (BN)", x: 103.75, y: 321.25 },
            { name: "Rozhok (DK)", x: 246.25, y: 181.25 },
            { name: "Ruins (DL)", x: 191.25, y: 196.25 },
            { name: "School (EL)", x: 257.5, y: 199 },
            { name: "Shelter (FL)", x: 347.5, y: 235 },
            { name: "Shooting Range (DJ)", x: 207.5, y: 105 },
            { name: "Stalber (FJ)", x: 348.75, y: 82.5 },
            { name: "Stalber Warehouse (FJ)", x: 340, y: 108.75 },
            { name: "Novorepnoye (FN)", x: 350, y: 367.5 },
            { name: "Novorepnoye Radio (FO)", x: 338.75, y: 382.5 },
            { name: "Water Town (DL)", x: 212.5, y: 191.25 },
            { name: "Woodcutter Camp (GM)", x: 390, y: 257.5 },
            { name: "Yasnaya Polyana (FK)", x: 330, y: 146.25 },
            { name: "Zharki (BJ)", x: 71.25, y: 77.5 }
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomMiramar(): DropLocation {
        let drops: DropLocation[] = [
            { name: "Alcantara (AJ)", x: 32.5, y: 86.25 },
            { name: "Campo Militar (GI)", x: 425, y: 35 },
            { name: "Chumacera (CN)", x: 166.25, y: 320 },
            { name: "Crater Fields (BK/CK)", x: 128.75, y: 122.5 },
            { name: "Cruz Del Valle (FJ)", x: 335, y: 100 },
            { name: "El Azahar (GK)", x: 390, y: 150 },
            { name: "El Pozo (BK)", x: 105, y: 181.25 },
            { name: "Graveyard (EL)", x: 275, y: 225 },
            { name: "Hacienda Del Patron (EK)", x: 267.5, y: 170 },
            { name: "Impala (GM)", x: 385, y: 288.75 },
            { name: "Islands (HM/HN)", x: 450, y: 310 },
            { name: "Junkyard (FL)", x: 360, y: 202.5 },
            { name: "La Bendita (EM)", x: 310, y: 255 },
            { name: "La Cobreria (CJ)", x: 156.25, y: 80 },
            { name: "Ladrillera (BM)", x: 115, y: 295 },
            { name: "Los Higos (CP)", x: 152.5, y: 447.5 },
            { name: "Los Leones (EN)", x: 290, y: 337.5 },
            { name: "Minas Generales (FL)", x: 75, y: 180 },
            { name: "Monte Nuevo (BL)", x: 120, y: 248.75 },
            { name: "Oasis (DI)", x: 230, y: 35 },
            { name: "Pecado (DM)", x: 225, y: 265 },
            { name: "Power Grid (DL)", x: 195, y: 215 },
            { name: "Prison (AP)", x: 50, y: 441.25 },
            { name: "Puerto Paraiso (GO)", x: 380, y: 387.5 },
            { name: "Ruins (AJ)", x: 12.5, y: 83.75 },
            { name: "San Martin (DK)", x: 233.75, y: 173.75 },
            { name: "Tierra Bronca (GJ)", x: 330, y: 36.25 },
            { name: "Torre Ahumada (FI)", x: 330, y: 36.25 },
            { name: "Trailer Park (AJ)", x: 51.25, y: 115 },
            { name: "Valle Del Mar (BN)", x: 90, y: 365 },
            { name: "Water Treatment (EJ)", x: 262.5, y: 117.5 }
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomSanhok(): DropLocation {
        let drops: DropLocation[] = [
            { name: "Ban Tai (CL)", x: 297.5, y: 455 },
            { name: "Bhan (CJ)", x: 361.25, y: 242.5 },
            { name: "Bootcamp (BJ)", x: 238.75, y: 238.75 },
            { name: "Bottom of East Island", x: -25, y: -25 },
            { name: "Camp Alpha (AJ)", x: 98.75, y: 202.5 },
            { name: "Camp Bravo (DJ)", x: 422.5, y: 191.25 },
            { name: "Camp Charlie (CL)", x: 290, y: 422.5 },
            { name: "Cave (CK)", x: 325, y: 375 },
            { name: "Docks (DL)", x: 405, y: 425 },
            { name: "Ha Tinh (BJ)", x: 158.75, y: 142.5 },
            { name: "Kampong (DK)", x: 418.75, y: 352.5 },
            { name: "Khao (CI)", x: 283.75, y: 91.25 },
            { name: "Lakawi (DK)", x: 427.5, y: 273.75 },
            { name: "Mountain (BJ)", x: 141.75, y: 201.75 },
            { name: "Mongnai (DI)", x: 390, y: 95 },
            { name: "Na Kham (BL)", x: 137.5, y: 402.5 },
            { name: "North-West Island", x: -25, y: -25 },
            { name: "Pai Nan (BK)", x: 231.25, y: 333.75 },
            { name: "Paradise Resort (CJ)", x: 307.5, y: 167.5 },
            { name: "Quarry (CK)", x: 330, y: 300 },
            { name: "Ruins (BK)", x: 148.75, y: 317.5 },
            { name: "Sahmee (BL)", x: 180, y: 435 },
            { name: "South-West Island", x: -25, y: -25 },
            { name: "Tambang (AK)", x: 105, y: 355 },
            { name: "Tat Mok (CI)", x: 270, y: 120 },
            { name: "Top of East Island", x: -25, y: -25 }
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }
}
