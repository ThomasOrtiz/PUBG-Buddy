import { MapName } from '../../pubg-typescript-api';


export class PubgMapService {

    static getMapDisplayName(mapName: MapName): string {
        switch(mapName) {
            case MapName.ERANGEL_MAIN:
                return 'Erangel';
            case MapName.DESERT_MAIN:
                return 'Miramar';
            case MapName.SANHOK_MAIN:
                return 'Sanhok';
            case MapName.VIKENDI_MAIN:
                return 'Vikendi';
            default:
                return '';
        }
    }
}
