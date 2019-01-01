import { CacheService } from '../';
import { PubgAPI, Season } from '../../pubg-typescript-api';
import { TimeInSeconds } from '../../shared/constants';
import { PubgPlatformService } from './platform.service';

const cache = new CacheService();


export class PubgSeasonService {

    /**
     * Get all available seasons
     * @param {PubgAPI} api
     * @returns {Promise<Season[]} list of seasons
     */
    static async getAvailableSeasons(api: PubgAPI): Promise<Season[]> {
        const cacheKey: string = `pubgApi.getAvailableSeasons.${api.platformRegion}`;
        const ttl: number = TimeInSeconds.TWO_HOUR;
        const storeFunction: Function = async (): Promise<Season[]> => {
            let seasons: Season[] = await Season.list(api);

            // Not supporting pre-release seasons
            seasons = seasons.filter(season => {
                const seasonId: string = season.id;
                return seasonId.indexOf('beta') === -1 && seasonId.indexOf('pre') === -1
            });

            // hardcoding
            if (PubgPlatformService.isPlatformPC(api.platformRegion)) {
                seasons.push({
                    id: 'lifetime',
                    _id: 'lifetime'
                } as unknown as Season);
            }

            return seasons;
        };

        return await cache.get<Season[]>(cacheKey, storeFunction, ttl);
    }

    /**
     * Converts the season to be in the API format
     * Ex: '2018-06' => '`division.bro.official.2018-06'
     * @param {string} seasonInput
     * @returns {string} api formatted season
     */
    static getPubgSeasonId(seasonInput: string): string {
        if (seasonInput === 'lifetime') {
            return seasonInput;
        }

        return `division.bro.official.${seasonInput}`;
    }

    static getSeasonDisplayName(season: Season): string {
        if (season.id  === 'lifetime') {
            return 'lifetime';
        }
        return season.id.split('division.bro.official.')[1];
    }

    /**
     * Gets the current Season
     * @param api
     * @returns {Promise<Season>} The current season
     */
    static async getCurrentSeason(api: PubgAPI): Promise<Season> {
        const seasons: Season[] = await this.getAvailableSeasons(api);
        return seasons.filter(season => season.isCurrentSeason)[0];
    }

    static isPreSeasonTen(season: string): boolean {
        const seasonTenYear: number = 2018;
        const seasonTenMonth: number = 10;

        let parts: string[] = season.split('-');
        const seasonYear: number = +parts[0];
        const seasonMonth: number = +parts[1];

        if (seasonYear === seasonTenYear && seasonMonth < seasonTenMonth) { return true; }

        return false;
    }

}
