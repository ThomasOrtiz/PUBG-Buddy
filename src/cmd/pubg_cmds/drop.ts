import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
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
            response = await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment) as Discord.Message;
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

        const font: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_RED_OUTLINE_128);
        const textObj: any = {
            text: 'x',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }

        const textWidth = Jimp.measureText(font, textObj.text);
        const textHeight = Jimp.measureTextHeight(font, textObj.text, textWidth);
        image.print(font, drop.x-(textWidth/2), drop.y-(textHeight/2), textObj);

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
                return  PubgMapImageLocation.MIRAMAR;
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
            const newMsg = await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment) as Discord.Message;
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
            const newMsg = await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment) as Discord.Message;
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
            const newMsg = await msg.channel.send(`${explanation}\nDrop at **${drop.name}**!`, attatchment) as Discord.Message;
            this.setupReactions(newMsg, originalPoster);
        });

        e_collector.on('end', () => { msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {}); }); });
        m_collector.on('end', () => { msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {}); }); });
        s_collector.on('end', () => { msg.clearReactions().catch(() => {}).then(() => { msg.edit(msg.content.split(explanation).join('')).catch(() => {}); }); });
    }

    private getDrop(map: string): DropLocation {
        switch (map) {
            case 'e': {
                return this.getRandomErangel();
            }
            case 'm': {
                return  this.getRandomMiramar();
            }
            case 's': {
                return this.getRandomSanhok();
            }
        }
    }

    private getRandomErangel(): DropLocation {
        let drops: DropLocation[] = [
            { name: 'Apartments (EL)', x: 1075, y: 815 },
            { name: 'Farm (FM)', x: 1330, y: 1120 },
            { name: 'Ferry Pier (CN)', x: 690, y: 1380 },
            { name: 'Gatka (CL)', x: 535, y: 965 },
            { name: 'Georgopol North (BK)', x: 440, y: 530 },
            { name: 'Georgopol Containers (BK)', x: 500, y: 685 },
            { name: 'Georgopol South-West (BK)', x: 395, y: 695 },
            { name: 'Hospital (BL)', x: 370, y: 775 },
            { name: 'Lipovka (GL)', x: 1727, y: 803 },
            { name: 'Mansion (GK)', x: 1518, y: 738 },
            { name: 'Military Base (EO)', x: 1095, y: 1550 },
            { name: 'Mylta (FM)', x: 1465, y: 1168 },
            { name: 'Mylta Power (HM)', x: 1775, y: 1080 },
            { name: 'Mylta Power Factory (GM)', x: 1685, y: 1130 },
            { name: 'Kameshki (GI)', x: 1630, y: 255 },
            { name: 'Pochinki (DL)', x: 885, y: 990 },
            { name: 'Primorsk (BN)', x: 395, y: 1490 },
            { name: 'Quarry (BN)', x: 415, y: 1285 },
            { name: 'Rozhok (DK)', x: 985, y: 725 },
            { name: 'Ruins (DL)', x: 765, y: 785 },
            { name: 'School (EL)', x: 1030, y: 796 },
            { name: 'Shelter (FL)', x: 1390, y: 940 },
            { name: 'Shooting Range (DJ)', x: 830, y: 420 },
            { name: 'Stalber (FJ)', x: 1395, y: 330 },
            { name: 'Stalber Warehouse (FJ)', x: 1360, y: 435 },
            { name: 'Novorepnoye (FN)', x: 1400, y: 1470 },
            { name: 'Novorepnoye Radio (FO)', x: 1355, y: 1530 },
            { name: 'Water Town (DL)', x: 850, y: 765 },
            { name: 'Woodcutter Camp (GM)', x: 1560, y: 1030 },
            { name: 'Yasnaya Polyana (FK)', x: 1320, y: 585 },
            { name: 'Zharki (BJ)', x: 285, y: 310 },
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomMiramar(): DropLocation {
        let drops: DropLocation[] = [
            { name: 'Alcantara (AJ)', x: 130, y: 345 },
            { name: 'Campo Militar (GI)', x: 1700, y: 140 },
            { name: 'Chumacera (CN)', x: 665, y: 1280 },
            { name: 'Crater Fields (BK/CK)', x: 515, y: 490 },
            { name: 'Cruz Del Valle (FJ)', x: 1340, y: 400 },
            { name: 'El Azahar (GK)', x: 1560, y: 600 },
            { name: 'El Pozo (BK)', x: 420, y: 725 },
            { name: 'Graveyard (EL)', x: 1100, y: 900 },
            { name: 'Hacienda Del Patron (EK)', x: 1070, y: 680 },
            { name: 'Impala (GM)', x: 1540, y: 1155 },
            { name: 'Islands (HM/HN)', x: 1800, y: 1240 },
            { name: 'Junkyard (FL)', x: 1440, y: 810 },
            { name: 'La Bendita (EM)', x: 1240, y: 1020 },
            { name: 'La Cobreria (CJ)', x: 625, y: 320 },
            { name: 'Ladrillera (BM)', x: 460, y: 1180 },
            { name: 'Los Higos (CP)', x: 610, y: 1790 },
            { name: 'Los Leones (EN)', x: 1160, y: 1350 },
            { name: 'Minas Generales (FL)', x: 300, y: 720 },
            { name: 'Monte Nuevo (BL)', x: 480, y: 995 },
            { name: 'Oasis (DI)', x: 920, y: 140 },
            { name: 'Pecado (DM)', x: 900, y: 10300 },
            { name: 'Power Grid (DL)', x: 780, y: 860 },
            { name: 'Prison (AP)', x: 200, y: 1765 },
            { name: 'Puerto Paraiso (GO)', x: 1520, y: 1550 },
            { name: 'Ruins (AJ)', x: 50, y: 335 },
            { name: 'San Martin (DK)', x: 935, y: 695 },
            { name: 'Tierra Bronca (GJ)', x: 1320, y: 145 },
            { name: 'Torre Ahumada (FI)', x: 1320, y: 145 },
            { name: 'Trailer Park (AJ)', x: 205, y: 460 },
            { name: 'Valle Del Mar (BN)', x: 360, y: 1460 },
            { name: 'Water Treatment (EJ)', x: 1050, y: 470 },
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomSanhok(): DropLocation {
        let drops: DropLocation[] = [
            { name: 'Ban Tai (CL)', x: 1190, y: 1820 },
            { name: 'Bhan (CJ)', x: 1445, y: 970 },
            { name: 'Bootcamp (BJ)', x: 955, y: 955 },
            { name: 'Bottom of East Island', x: -100, y: -100 },
            { name: 'Camp Alpha (AJ)', x: 395, y: 810 },
            { name: 'Camp Bravo (DJ)', x: 1690, y: 765 },
            { name: 'Camp Charlie (CL)', x: 1160, y: 1690 },
            { name: 'Cave (CK)', x: 1300, y: 1500 },
            { name: 'Docks (DL)', x: 1620, y: 1700 },
            { name: 'Ha Tinh (BJ)', x: 635, y: 570 },
            { name: 'Kampong (DK)', x: 1675, y: 1410 },
            { name: 'Khao (CI)', x: 1135, y: 365 },
            { name: 'Lakawi (DK)', x: 1710, y: 1095 },
            { name: 'Mountain (BJ)', x: 567, y: 807 },
            { name: 'Mongnai (DI)', x: 1560, y: 380 },
            { name: 'Na Kham (BL)', x: 550, y: 1610 },
            { name: 'North-West Island', x: -100, y: -100 },
            { name: 'Pai Nan (BK)', x: 925, y: 1335 },
            { name: 'Paradise Resort (CJ)', x: 1230, y: 670 },
            { name: 'Quarry (CK)', x: 1320, y: 1200 },
            { name: 'Ruins (BK)', x: 595, y: 1270 },
            { name: 'Sahmee (BL)', x: 720, y: 1740 },
            { name: 'South-West Island', x: -100, y: -100 },
            { name: 'Tambang (AK)', x: 420, y: 1420 },
            { name: 'Tat Mok (CI)', x: 1080, y: 480 },
            { name: 'Top of East Island', x: -100, y: -100 },
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }
}
