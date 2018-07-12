import {
    SqlPlayersService as sqlPlayersService,
    SqlModesService as sqlModeService,
    SqlRegionsService as sqlRegionService,
    SqlSqaudSizeService as sqlSquadSizeService,
    SqlSeasonsService as sqlSeasonService
 } from './sql.service';
import { Player, PlayerSeason, PubgAPI, Season, PlatformRegion } from 'pubg-typescript-api';


export class PubgService {

    /**
     * Returns a pubg character id
     * @param {string} name
     * @returns {Promise<string>} a promise that resolves to a pubg id
     */
    static async getPlayerId(api: PubgAPI, name: string): Promise<string> {
        const player = await sqlPlayersService.getPlayer(name);

        if(player && player.pubg_id && player.pubg_id !== '') {
            return player.pubg_id;
        } else {
            return await this.getPlayerIdByName(api, [name]);
        }
    }

    static async getPlayerByName(api: PubgAPI, names: string[]): Promise<Player[]> {
        return Player.filterByName(api, names);
    }

    static async getPlayerIdByName(api: PubgAPI, names: string[]): Promise<string> {
        const result: Player[] = await Player.filterByName(api, names);

        if(result.length > 0) {
            const player = result[0];
            sqlPlayersService.addPlayer(player.name, player.id)
            return player.id;
        } else {
            return '';
        }
    }

    static async getPlayerSeasonStatsById(api: PubgAPI, id: string, season: string): Promise<PlayerSeason> {
        return PlayerSeason.get(api, id, this.getPubgSeasonId(season));
    }

    //////////////////////////////////////
    // Seasons
    //////////////////////////////////////
    static getPubgSeasonId(seasonInput: string) {
        const prefix = 'division.bro.official.';
        return prefix + seasonInput;
    }

    static async getAvailableSeasons(api: PubgAPI): Promise<any> {
        let seasons: Season[] = await Season.list(api);
        console.log('seasons', JSON.stringify(seasons, null, 2));
        return seasons;
    }

    static async getCurrentSeason(api: PubgAPI): Promise<any> {
        let seasons: Season[] = await Season.list(api);
        const currentSeason = seasons.filter(season => season.isCurrentSeason)[0];
        return currentSeason;
    }

    //////////////////////////////////////
    // Regions
    //////////////////////////////////////
    static getPubgRegionFromInput(region: string): string {
        const pubg_region: string = Object.keys(PlatformRegion).find(key => PlatformRegion[key] === region) as PlatformRegion;
        return pubg_region;
    }

    //////////////////////////////////////
    // Rating Calculation
    //////////////////////////////////////
    static calculateOverallRating(winRating: number, killRating: number): number {
        return winRating + (killRating / 5);
    }

    //////////////////////////////////////
    // Validation
    //////////////////////////////////////
    static async isValidSeason(checkSeason): Promise<boolean> {
        let seasons = await sqlSeasonService.getAllSeasons();
        for(let i = 0; i < seasons.length; i++) {
            if(seasons[i].season === checkSeason) return true;
        }
        return false;
    }

    static async isValidRegion(checkRegion): Promise<boolean> {
        let regions = await sqlRegionService.getAllRegions();
        for(let i = 0; i < regions.length; i++) {
            if(regions[i].shortname === checkRegion) return true;
        }
        return false;
    }

    static async isValidMode(checkMode): Promise<boolean> {
        let modes = await sqlModeService.getAllModes();
        for(let i = 0; i < modes.length; i++) {
            if(modes[i].shortname === checkMode) return true;
        }
        return false;
    }

    static async isValidSquadSize(checkSize): Promise<boolean> {
        if(!(+checkSize)) {
            return false;
        }
        checkSize = +checkSize;
        let squadSizes = await sqlSquadSizeService.getAllSquadSizes();
        for(let i = 0; i < squadSizes.length; i++) {
            if(squadSizes[i].size === checkSize) return true;
        }
        return false;
    }
}
