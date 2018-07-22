import { CommonService as cs } from '../services/common.service';
import * as Discord from 'discord.js';
import {
    SqlPlayersService as sqlPlayersService
 } from './sql.service';
import { Player, PlayerSeason, PubgAPI, Season, PlatformRegion, GameMode } from 'pubg-typescript-api';
import CacheService from './cache.service';

const ttl: number = 60 * 60 * 1      // caches for 1 hour
const cache = new CacheService(ttl); // create a new cache service instance


export class PubgService {

    //////////////////////////////////////
    // Player Data
    //////////////////////////////////////

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
            return await this.getPlayerIdByName(api, name);
        }
    }

    /**
     * Get player(s) by name
     * @param {PubgAPI} api
     * @param {string[]} names
     * @returns {Promise<Player[]>} list of player(s)
     */
    static async getPlayerByName(api: PubgAPI, names: string[]): Promise<Player[]> {
        // TODO: Can this be cached easily?
        return Player.filterByName(api, names);
    }

    /**
     * Get a player's id
     * @param {PubgAPI} api
     * @param {string[]} names
     * @returns {Promise<string>} a player's id
     */
    static async getPlayerIdByName(api: PubgAPI, name: string): Promise<string> {
        const cacheKey: string = `pubgApi.getPlayerIdByName-${name}`;
        const ttl: number = 60 * 60 * 2;  // caches for 2 hour
        const storeFunction: Function = async (): Promise<string> => {
            const result: Player[] = await Player.filterByName(api, [name]);

            if(result.length > 0) {
                const player = result[0];
                sqlPlayersService.addPlayer(player.name, player.id)
                return player.id;
            } else {
                return '';
            }
        };

        return await cache.get<string>(cacheKey, storeFunction, ttl);
    }

    /**
     * Retreives a player's season stats for the specified season
     * @param {PubgAPI} api
     * @param {string} id
     * @param {string} season
     * @returns {Promise<PlayerSeason>}
     */
    static async getPlayerSeasonStatsById(api: PubgAPI, id: string, season: string): Promise<PlayerSeason> {
        const cacheKey: string = `pubgApi.getPlayerSeasonStatsById-${id}-${season}`;
        const ttl: number = 60 * 5;  // caches for 5 minutes
        const storeFunction: Function = async (): Promise<PlayerSeason> => {
            const seasonId: string = this.getPubgSeasonId(season);
            return PlayerSeason.get(api, id, seasonId);
        };

        return await cache.get<PlayerSeason>(cacheKey, storeFunction, ttl);
    }

    //////////////////////////////////////
    // Seasons
    //////////////////////////////////////

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
    static async getAvailableSeasons(api: PubgAPI): Promise<Season[]> {
        const cacheKey: string = 'pubgApi.getAvailableSeasons';
        const ttl: number = 60 * 60 * 2;  // caches for 2 hour
        const storeFunction: Function = async (): Promise<Season[]> => {
            return await Season.list(api);
        };

        return await cache.get<Season[]>(cacheKey, storeFunction, ttl);
    }

    /**
     * Gets the current Season
     * @param api
     * @returns {Promise<Season>} The current season
     */
    static async getCurrentSeason(api: PubgAPI): Promise<Season> {
        const cacheKey: string = 'pubgApi.getCurrentSeason';
        const ttl: number = 60 * 60 * 2;  // caches for 2 hour
        const storeFunction: Function = async (): Promise<Season> => {
            let seasons: Season[] = await Season.list(api);
            const currentSeason = seasons.filter(season => season.isCurrentSeason)[0];
            return currentSeason;
        };

        return await cache.get<Season>(cacheKey, storeFunction, ttl);
    }

    //////////////////////////////////////
    // Regions
    //////////////////////////////////////

    static getPubgRegionFromInput(region: string): string {
        const pubg_region: string = Object.keys(PlatformRegion).find(key => PlatformRegion[key] === region) as PlatformRegion;
        return pubg_region;
    }

    static getAvailableRegions(): string[] {
        return Object.values(PlatformRegion);
    }

    //////////////////////////////////////
    // Modes
    //////////////////////////////////////

    static getAvailableModes(): string[] {
        return Object.values(GameMode);
    }

    //////////////////////////////////////
    // Rating Calculation
    //////////////////////////////////////

    /**
     * Calculates the character's rating with following formula:
     *      overall_rating = win_rating + (kill_rating / 5)
     * @param {number} winRating
     * @param {number} killRating
     * @returns {number} overall rating
     */
    static calculateOverallRating(winRating: number, killRating: number): number {
        return winRating + (killRating / 5);
    }

    //////////////////////////////////////
    // Validation
    //////////////////////////////////////

    /**
     * Validates all parameters
     * @param msg
     * @param help
     * @param checkSeason
     * @param checkRegion
     * @param checkMode
     */
    static async validateParameters(msg: Discord.Message, help: any, checkSeason: string, checkRegion: string, checkMode: string): Promise<boolean> {
        let errMessage: string   = '';

        const api = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA);
        let validSeason: boolean = await this.isValidSeason(api, checkSeason);
        let validRegion: boolean = this.isValidRegion(checkRegion);
        let validMode: boolean   = this.isValidGameMode(checkMode);

        if (!validSeason) {
            let seasons: Season[] = await this.getAvailableSeasons(api);

            // Not supporting pre-release seasons
            seasons = seasons.filter(season => {
                const seasonId = season.id;
                return seasonId.indexOf('beta') === -1 && seasonId.indexOf('pre') === -1
            });

            let availableSeasons: string = '== Available Seasons ==\n';
            for (let i = 0; i < seasons.length; i++) {
                const seasonId = seasons[i].id.split('division.bro.official.')[1];
                if (i < seasons.length - 1) {
                    availableSeasons += `${seasonId}, `;
                }
                else {
                    availableSeasons += seasonId;
                }
            }

            errMessage += `Error:: Invalid season parameter\n${availableSeasons}\n`;
        }
        if (!validRegion) {
            const regionValues: string[] = this.getAvailableRegions();
            let availableRegions: string = '== Available Regions ==\n';

            const regionsLength = regionValues.length;
            for (let i = 0; i < regionsLength; i++) {
                const region = regionValues[i];
                if (i < regionsLength - 1) {
                    availableRegions += region + ', ';
                }
                else {
                    availableRegions += region;
                }
            }
            errMessage += `\nError:: Invalid region parameter\n${availableRegions}\n`;
        }
        if (!validMode) {
            let gameModeValues: string[] = this.getAvailableModes();
            let availableModes: string = '== Available Modes ==\n';

            const gameModesLength = gameModeValues.length;
            for (let i = 0; i < gameModesLength; i++) {
                const gameMode = gameModeValues[i];
                if (i < gameModesLength - 1) {
                    availableModes += gameMode + ', ';
                }
                else {
                    availableModes += gameMode;
                }
            }
            errMessage += `\nError:: Invalid mode parameter\n${availableModes}\n`;
        }

        if (!validSeason || !validRegion || !validMode) {
            cs.handleError(msg, errMessage, help);
            return false;
        }
        return true;
    }

    /**
     * Checks if the season is valid
     * @param {PubgApi} api
     * @param {string} checkSeason season to check
     * @returns {Promise<boolean>} is valid
     */
    static async isValidSeason(api: PubgAPI, checkSeason: string): Promise<boolean> {
        let api_seasons: Season[] = await this.getAvailableSeasons(api);

        for (let i = 0; i < api_seasons.length; i++) {
            let season: Season = api_seasons[i];
            const season_ui_id: string = season.id.split('division.bro.official.')[1]
            if(checkSeason === season_ui_id) { return true; }
        }
        return false;
    }

    /**
     * Checks if the region is valid
     * @param {string} checkRegion
     * @returns {boolean} is valid
     */
    static isValidRegion(checkRegion: string): boolean {
        const region: PlatformRegion = PlatformRegion[checkRegion.toUpperCase()];

        if (region) {
            return true;
        }
        return false;
    }

    /**
     * Checks if the mode is valid
     * @param {string} checkGameMode
     * @returns {boolean} is valid
     */
    static isValidGameMode(checkGameMode: string): boolean {
        const gameMode: GameMode = GameMode[checkGameMode.toUpperCase()];

        if (gameMode) {
            return true;
        }
        return false;
    }
}
