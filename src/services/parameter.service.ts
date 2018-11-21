import {
    CommonService as cs,
    PubgSeasonService,
    SqlUserRegisteryService as sqlUserRegisteryService,
    PubgPlatformService
} from './'
import { IServer, PubgParameters } from '../interfaces';
import { PubgAPI, PlatformRegion, Season } from '../pubg-typescript-api';


export class ParameterService {

    /**
     * Gets common PUBG parameters with an optional username
     * @param {string} params  string of params
     * @param {string} msgAuthorId discord msg author id
     * @param {boolean} getUsername
     * @param {Server} serverDefaults
     */
    static async getPubgParameters(params: string, msgAuthorId: string, getUsername: boolean, serverDefaults?: IServer): Promise<PubgParameters> {
        const re: RegExp = /^(.*?)\s?(region=\S+|season=\S+|mode=\S+)?\s?(region=\S+|season=\S+|mode=\S+)?\s?(region=\S+|season=\S+|mode=\S+)?$/
        const result: Array<any> = params.match(re);

        enum param_location {
            match = 0,
            username = 1,
            region_season_mode_1 = 2,
            region_season_mode_2 = 3,
            region_season_mode_3 = 4
        }

        //const fullMatch: string = result[param_location.match];
        let parameters: PubgParameters;
        const username: string = result[param_location.username];
        const potential_region_season_mode: string[] = [result[param_location.region_season_mode_1], result[param_location.region_season_mode_2], result[param_location.region_season_mode_3]];

        if (serverDefaults) {
            parameters = {
                username: username,
                region: this.getParamValue('region=', potential_region_season_mode, serverDefaults.default_region).toUpperCase().replace('-', '_'),
                season: this.getParamValue('season=', potential_region_season_mode, serverDefaults.default_season),
                mode: this.getParamValue('mode=', potential_region_season_mode, serverDefaults.default_mode).toUpperCase().replace('-', '_'),
            } as PubgParameters;
        } else {
            const region: string = this.getParamValue('region=', potential_region_season_mode, 'pc_na').toUpperCase().replace('-', '_');
            const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[region]);
            const currentSeason: Season = await PubgSeasonService.getCurrentSeason(api);
            const currentSeasonName: string = PubgSeasonService.getSeasonDisplayName(currentSeason);

            parameters = {
                username: username,
                region: region,
                season: this.getParamValue('season=', potential_region_season_mode, currentSeasonName),
                mode: this.getParamValue('mode=', potential_region_season_mode, 'solo_fpp').toUpperCase().replace('-', '_'),
            } as PubgParameters;
        }

        // Try to get username from user registery
        if (getUsername && !parameters.username) {
            parameters.username = await sqlUserRegisteryService.getRegisteredUser(msgAuthorId);
        }

        return parameters;
    }

    /**
     * Returns the value of the key=value pair.
     * @param {string} search parameter to search for
     * @param {array} params array of parameters to search through
     * @param {string} defaultParam default return value if search does not exist
     */
    static getParamValue(search: string, params: Array<any>, defaultParam: any): string {
        if (!params) { return defaultParam; }

        let index = cs.isSubstringOfElement(search, params);
        if (index >= 0) {
            return params[index].slice(params[index].indexOf('=') + 1).toLowerCase();
        } else {
            return defaultParam;
        }
    }

}
