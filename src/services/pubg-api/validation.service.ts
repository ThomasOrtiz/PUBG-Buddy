import * as Discord from 'discord.js';
import {
    CommonService as cs,
    DiscordMessageService as discordMessageService } from '../';
import { PubgAPI, Season, PlatformRegion, GameMode } from '../../pubg-typescript-api';
import { PubgSeasonService } from './season.service';
import { PubgRegionService } from './region.service';
import { PubgModeService } from './mode.service';
import { PubgPlatformService } from './platform.service';



export class PubgValidationService {

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

        let validRegion: boolean = this.isValidRegion(checkRegion);
        let validSeason: boolean = false;
        let validMode: boolean = false;

        let api: PubgAPI;
        const region: PlatformRegion = PlatformRegion[checkRegion];
        if (validRegion) {
            api = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), region);
            validSeason = await this.isValidSeason(api, checkSeason);
        }
        validMode = this.isValidGameMode(checkMode);

        if (validRegion && !validSeason) {
            let seasons: Season[] = await PubgSeasonService.getAvailableSeasons(api);

            let availableSeasons: string = '== Available Seasons ==\n';
            for (let i = 0; i < seasons.length; i++) {
                const season: Season = seasons[i];
                let seasonDisplayName = PubgSeasonService.getSeasonDisplayName(season);
                seasonDisplayName += season.isCurrentSeason ? ' (current)': '';

                if (i < seasons.length - 1) {
                    availableSeasons += `${seasonDisplayName}, `;
                }
                else {
                    availableSeasons += seasonDisplayName;
                }
            }

            const platformDisplaneName: string = PubgPlatformService.getPlatformDisplayName(region);

            errMessage += `Error:: Invalid ${platformDisplaneName} season parameter - "${checkSeason}"\n${availableSeasons}\n`;
        }
        if (!validRegion) {
            const regionValues: string[] = PubgRegionService.getAvailableRegions();
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
            errMessage += `\nError:: Invalid region parameter - "${checkRegion}"\n${availableRegions}\n`;
        }
        if (!validMode) {
            let gameModeValues: string[] = PubgModeService.getAvailableModes();
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
            errMessage += `\nError:: Invalid mode parameter - "${checkMode}"\n${availableModes}\n`;
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
        let api_seasons: Season[] = await PubgSeasonService.getAvailableSeasons(api);

        for (let i = 0; i < api_seasons.length; i++) {
            let season: Season = api_seasons[i];
            const season_ui_id: string = season.id.split('division.bro.official.')[1]
            if (checkSeason === season_ui_id) { return true; }
        }
        return false;
    }

    /**
     * Checks if the region is valid
     * @param {string} checkRegion
     * @returns {boolean} is valid
     */
    static isValidRegion(checkRegion: string): boolean {
        // Temporarily not supporting Xbox
        // if (checkRegion.toLowerCase().indexOf('xbox') >= 0) {
        //     return false;
        // }

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
