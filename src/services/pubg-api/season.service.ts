import { CacheService } from '../';
import { PubgAPI, Season } from 'pubg-typescript-api';
import { TimeInSeconds } from '../../shared/constants';

const cache = new CacheService();


export class PubgSeasonService {

    /**
     * Converts the season to be in the API format
     * Ex: '2018-06' => '`division.bro.official.2018-06'
     * @param {string} seasonInput
     * @returns {string} api formatted season
     */
    static getPubgSeasonId(seasonInput: string) {
        return `division.bro.official.${seasonInput}`;
    }

    /**
     * Get all available seasons
     * @param {PubgAPI} api
     * @returns {Promise<Season[]} list of seasons
     */
    static async getAvailableSeasons(api: PubgAPI, removeBeta?: boolean): Promise<Season[]> {
        const cacheKey: string = `pubgApi.getAvailableSeasons.${api.platformRegion}`;
        const ttl: number = TimeInSeconds.TWO_HOUR;
        const storeFunction: Function = async (): Promise<Season[]> => {
            return await Season.list(api);
        };

        let seasons: Season[] = await cache.get<Season[]>(cacheKey, storeFunction, ttl);

        // Not supporting pre-release seasons
        if (removeBeta) {
            seasons = seasons.filter(season => {
                const seasonId = season.id;
                return seasonId.indexOf('beta') === -1 && seasonId.indexOf('pre') === -1
            });
        }

        // Handle specical case of pubg api not returning seasons
        if (!seasons || seasons.length === 0) {
            const seasonsIds: string[] = [
                '2018-01', '2018-02', '2018-03', '2018-04', '2018-05', '2018-06', '2018-07', '2018-08', '2018-09'
            ]

            for (let i = 0; i < seasonsIds.length; i++) {
                seasons.push({ id: this.getPubgSeasonId(seasonsIds[i]) } as Season)
            }

        }

        return seasons;
    }

    static getSeasonDisplayName(season: Season): string {
        return season.id.split('division.bro.official.')[1];
    }

    /**
     * Gets the current Season
     * @param api
     * @returns {Promise<Season>} The current season
     */
    static async getCurrentSeason(api: PubgAPI): Promise<Season> {
        const cacheKey: string = 'pubgApi.getCurrentSeason';
        const ttl: number = TimeInSeconds.TWO_HOUR;
        const storeFunction: Function = async (): Promise<Season> => {
            let seasons: Season[] = await Season.list(api);
            const currentSeason = seasons.filter(season => season.isCurrentSeason)[0];
            return currentSeason;
        };

        return await cache.get<Season>(cacheKey, storeFunction, ttl);
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
