import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import {
    AnalyticsService as analyticsService,
    DiscordMessageService as discordMessageService
 } from '../../services';


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
        usage: '<prefix>drop <e || m || s>',
        examples: [
            '!pubg-drop e',
            '!pubg-drop m',
            '!pubg-drop s',
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        let mapName: string;

        try {
            mapName = this.getParameters(msg, params);
        } catch { return; }

        let randomDrop;
        let fullMapName: string;
        switch (mapName) {
            case 'e': {
                fullMapName = 'Erangel';
                randomDrop = this.getRandomErangel();
                break;
            }
            case 'm': {
                fullMapName = 'Miramar';
                randomDrop = this.getRandomMiramar();
                break;
            }
            case 's': {
                fullMapName = 'Sanhok';
                randomDrop = this.getRandomSanhok();
                break;
            }
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            mapName: fullMapName,
            drop: randomDrop
        });


        msg.channel.send(`Drop \`${randomDrop}\`!`);
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private getParameters(msg: Discord.Message, params: string[]): string {
        if (params.length < 1) {
            discordMessageService.handleError(msg, 'Error:: Must specify a map name', this.help);
            throw 'Error:: Must use "e", "m", or "s"';
        }

        let mapName: string = params[0].toLowerCase();

        if (mapName !== 'e' && mapName !== 'm' && mapName !== 's') {
            discordMessageService.handleError(msg, 'Error:: Must specify a map name', this.help);
            throw 'Error:: Must use "e", "m", or "s"';
        }

        return mapName;
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
            'Ban Tai (CH)',
            'Bhan (CF)',
            'Bootcamp (BF)',
            'Bottom of East Island',
            'Camp Alpha (AF)',
            'Camp Bravo (DF)',
            'Camp Charlie (CH)',
            'Cave (CG)',
            'Docks (DH)',
            'Ha Tinh (BF)',
            'Kampong (DG)',
            'Khao (CE)',
            'Lakawi (DG)',
            'Mountain (BF)',
            'Mongnai (DE)',
            'Na Kham (BH)',
            'North-West Island',
            'Pai Nan (BG)',
            'Paradise Resort (CF)',
            'Quarry (CG)',
            'Ruins (BG)',
            'Sahmee (BH)',
            'South-West Island',
            'Tambang (AG)',
            'Tat Mok (CE)',
            'Top of East Island',
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }
}
