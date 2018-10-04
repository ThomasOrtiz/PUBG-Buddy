import * as Discord from 'discord.js';
import {
    CacheService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    SqlPlayersService as sqlPlayersService
 } from './';
import { Player, PlayerSeason, PubgAPI, Season, PlatformRegion, GameMode } from 'pubg-typescript-api';
import { TimeInSeconds, PubgRankBreakPoints, PubgRankImageLocation } from '../shared/constants';

const cache = new CacheService();


export class PubgService {

    //////////////////////////////////////
    // PubgApi
    //////////////////////////////////////
    static getSeasonStatsApi(platform: PlatformRegion, season: string): PubgAPI {
        const apiKey: string = cs.getEnvironmentVariable('pubg_api_key');

        if (this.isPlatformXbox(platform) || (this.isPlatformPC(platform) && this.isPreSeasonTen(season))) {
            return new PubgAPI(apiKey, platform);
        }

        return new PubgAPI(apiKey, PlatformRegion.STEAM);
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

    static isPlatformXbox(platform: PlatformRegion): boolean {
        return platform === PlatformRegion.XBOX_AS ||
            platform === PlatformRegion.XBOX_EU ||
            platform === PlatformRegion.XBOX_NA ||
            platform === PlatformRegion.XBOX_OC;
    }

    static isPlatformPC(platform: PlatformRegion): boolean {
        return platform === PlatformRegion.PC_KRJP ||
            platform === PlatformRegion.PC_JP ||
            platform === PlatformRegion.PC_NA ||
            platform === PlatformRegion.PC_EU ||
            platform === PlatformRegion.PC_OC ||
            platform === PlatformRegion.PC_KAKAO ||
            platform === PlatformRegion.PC_SEA ||
            platform === PlatformRegion.PC_SA ||
            platform === PlatformRegion.PC_AS
    }








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
        const cacheKey: string = `pubgApi.getPlayerByName-${api.platformRegion}-${names}`;
        const ttl: number = TimeInSeconds.FIFTHTEEN_MINUTES;
        const storeFunction: Function = async (): Promise<Player[]> => {
            return Player.filterByName(api, names).catch(() => []);
        };

        return await cache.get<Player[]>(cacheKey, storeFunction, ttl);
    }

    /**
     * Get a player's id
     * @param {PubgAPI} api
     * @param {string[]} names
     * @returns {Promise<string>} a player's id
     */
    static async getPlayerIdByName(api: PubgAPI, name: string): Promise<string> {
        const cacheKey: string = `pubgApi.getPlayerIdByName-${name}-${api.platformRegion}`;
        const ttl: number = TimeInSeconds.TWO_HOUR;
        const storeFunction: Function = async (): Promise<string> => {
            const result: Player[] = await Player.filterByName(api, [name]).catch(() => { return []; });

            if(result.length > 0) {
                const player = result[0];
                await sqlPlayersService.addPlayer(player.name, player.id)
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
        const cacheKey: string = `pubgApi.getPlayerSeasonStatsById-${id}-${season}-${api.platformRegion}`;
        const ttl: number = TimeInSeconds.FIFTHTEEN_MINUTES;
        const storeFunction: Function = async (): Promise<PlayerSeason> => {
            const seasonId: string = this.getPubgSeasonId(season);
            return PlayerSeason.get(api, id, seasonId);
        };

        return await cache.get<PlayerSeason>(cacheKey, storeFunction, ttl);
    }

    static getRankBadgeImageFromRanking(ranking: number): PubgRankImageLocation {
        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return PubgRankImageLocation.UNRANKED_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_BRONZE) {
            return PubgRankImageLocation.BRONZE_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_SILVER) {
            return PubgRankImageLocation.SILVER_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_GOLD) {
            return PubgRankImageLocation.GOLD_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_PLATINUM) {
            return PubgRankImageLocation.PLATINUM_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_DIAMOND) {
            return PubgRankImageLocation.DIAMOND_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_ELITE) {
            return PubgRankImageLocation.ELITE_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_MASTER) {
            return PubgRankImageLocation.MASTER_BADGE;
        } else {
            return PubgRankImageLocation.GRANDMASTER_BADGE;
        }
    }

    static getRankRibbionImageFromRanking(ranking: number): PubgRankImageLocation {
        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return PubgRankImageLocation.UNRANKED_BADGE;
        } else if (ranking <= PubgRankBreakPoints.MAX_BRONZE) {
            return PubgRankImageLocation.BRONZE_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_SILVER) {
            return PubgRankImageLocation.SILVER_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_GOLD) {
            return PubgRankImageLocation.GOLD_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_PLATINUM) {
            return PubgRankImageLocation.PLATINUM_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_DIAMOND) {
            return PubgRankImageLocation.DIAMOND_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_ELITE) {
            return PubgRankImageLocation.ELITE_RIBBON;
        } else if (ranking <= PubgRankBreakPoints.MAX_MASTER) {
            return PubgRankImageLocation.MASTER_RIBBON;
        } else {
            return PubgRankImageLocation.GRANDMASTER_RIBBON;
        }
    }

    static getRankTitleFromRanking(ranking: number): string {
        let rank = 'Unranked';

        if (ranking === PubgRankBreakPoints.UNRANKED) {
            return rank;
        } else if (ranking < PubgRankBreakPoints.MAX_BRONZE) {
            return 'Bronze';
        } else if (ranking < PubgRankBreakPoints.MAX_SILVER) {
            return 'Silver';
        } else if (ranking < PubgRankBreakPoints.MAX_GOLD) {
            return 'Gold';
        } else if (ranking < PubgRankBreakPoints.MAX_PLATINUM) {
            return 'Platinum';
        } else if (ranking < PubgRankBreakPoints.MAX_DIAMOND) {
            return 'Diamond';
        } else if (ranking < PubgRankBreakPoints.MAX_ELITE) {
            return 'Elite';
        } else if (ranking < PubgRankBreakPoints.MAX_MASTER) {
            return 'Master';
        } else {
            return 'GrandMaster';
        }
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
    static async getAvailableSeasons(api: PubgAPI, removeBeta?: boolean): Promise<Season[]> {
        const cacheKey: string = 'pubgApi.getAvailableSeasons';
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

            for(let i = 0; i < seasonsIds.length; i++) {
                seasons.push({ id: this.getPubgSeasonId(seasonsIds[i]) } as Season)
            }

        }

        return seasons;
    }

    static async getSeasonDisplayName(api: PubgAPI, seasonYearMonth: string): Promise<string> {
        const seasons: Season[] = await this.getAvailableSeasons(api, true);

        for (let i = 0; i < seasons.length; i++) {
            let season: Season = seasons[i];
            const season_ui_id: string = season.id.split('division.bro.official.')[1]
            if(seasonYearMonth === season_ui_id) {
                return `Season ${i+1}`;
            }
        }
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
     * @returns {Promise<boolean>} t/f value if valid
     */
    static async validateParameters(msg: Discord.Message, help: any, checkSeason: string, checkRegion: string, checkMode: string): Promise<boolean> {
        let errMessage: string   = '';

        const api = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA);
        let validSeason: boolean = await this.isValidSeason(api, checkSeason);
        let validRegion: boolean = this.isValidRegion(checkRegion);
        let validMode: boolean   = this.isValidGameMode(checkMode);

        if (!validSeason) {
            let seasons: Season[] = await this.getAvailableSeasons(api, true);

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
            discordMessageService.handleError(msg, errMessage, help);
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
        let api_seasons: Season[] = await this.getAvailableSeasons(api, true);

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
