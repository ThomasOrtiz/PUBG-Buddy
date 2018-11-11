import { GameMode } from 'pubg-typescript-api';


export class PubgModeService {

    static getAvailableModes(): string[] {
        return Object.values(GameMode);
    }

}
