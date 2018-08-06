import { CommonService as cs } from '../../services/common.service';
import { DiscordClientWrapper } from '../../DiscordClientWrapper';
import * as Discord from 'discord.js';
import { Command, CommandConfiguration, CommandHelp } from '../../models/models.module';
import { AnalyticsService as mixpanel } from '../../services/analytics.service';

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
            '!pubg-drop'
        ]
    }

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        mixpanel.track(this.help.name, {
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length
        });

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

        mixpanel.track(this.help.name, {
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
            cs.handleError(msg, 'Error:: Must specify a map name', this.help);
            throw 'Error:: Must specify a map name (e || m || s';
        }

        let mapName: string = params[0].toLowerCase();

        if (mapName !== 'e' && mapName !== 'm' && mapName !== 's') {
            cs.handleError(msg, 'Error:: Must use "e", "m", or "s"', this.help);
        }

        return mapName;
    }


    private getRandomErangel(): string {
        let drops: string[] = [
            'Apartments',
            'Farm',
            'Ferry Pier',
            'Gatka',
            'Gerogopol',
            'Hospital',
            'Lipovka',
            'Mansion',
            'Military Base',
            'Mylta',
            'Mylta Power',
            'Mylta Power Factory',
            'Kameshki',
            'Pochinki',
            'Primorsk',
            'Quarry',
            'Rozhok',
            'Ruins',
            'School',
            'Shelter',
            'Shooting Range',
            'Stalber',
            'Stalber Warehouse',
            'Novorepnoye',
            'Novorepnoye Radio',
            'Water Town',
            'Woodcutter Camp',
            'Yasnaya Polyana',
            'Zharki'
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomMiramar(): string {
        let drops: string[] = [
            'Campo Militar',
            'Chumacera',
            'Crater Fields',
            'Cruz Del Valle',
            'El Azahar',
            'El Pozo',
            'Graveyard',
            'Hacienda Del Patron',
            'Impala',
            'Islands',
            'Junkyard',
            'La Bendita',
            'La Cobreria',
            'Lost Higos',
            'Los Leones',
            'Minas Generales',
            'Monte Nuevo',
            'Oasis',
            'Power Grid',
            'Prison',
            'Puerto Paraiso',
            'Ruins',
            'San Martin',
            'Tierra Bronca',
            'Torre Ahumada',
            'Trailer Park',
            'Valle Del Mar',
            'Water Treatment'
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }

    private getRandomSanhok(): string {
        let drops: string[] = [
            'Ban Tai',
            'Bhan',
            'Bootcamp',
            'Camp Alpha',
            'Camp Bravo',
            'Camp Charlie',
            'Cave',
            'Docks',
            'Ha Tinh',
            'Lakawi',
            'Kampong',
            'Khao',
            'Mongnai',
            'Paradise Resort',
            'Quarry',
            'Na Kham',
            'Pai Nan',
            'Ruins',
            'Sahmee',
            'Tambang',
            'Tat Mok'
        ];

        const random = Math.floor(Math.random() * drops.length);
        const location = drops[random];

        return location;
    }
}
