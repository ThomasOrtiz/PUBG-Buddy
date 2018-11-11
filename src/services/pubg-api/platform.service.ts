import { CommonService as cs } from '..';
import { PubgAPI, PlatformRegion } from 'pubg-typescript-api';
import { PubgSeasonService } from './season.service';


export class PubgPlatformService {

    static getSeasonStatsApi(platform: PlatformRegion, season: string): PubgAPI {
        const apiKey: string = cs.getEnvironmentVariable('pubg_api_key');

        if (this.isPlatformXbox(platform) || (this.isPlatformPC(platform) && PubgSeasonService.isPreSeasonTen(season))) {
            return new PubgAPI(apiKey, platform);
        }

        return new PubgAPI(apiKey, PlatformRegion.STEAM);
    }

    static isPlatformXbox(platform: PlatformRegion): boolean {
        const xboxRegions: PlatformRegion[] = [
            PlatformRegion.XBOX_AS, PlatformRegion.XBOX_EU,
            PlatformRegion.XBOX_NA, PlatformRegion.XBOX_OC
        ];
        return xboxRegions.includes(platform);
    }

    static isPlatformPC(platform: PlatformRegion): boolean {
        const pcRegions: PlatformRegion[] = [
            PlatformRegion.STEAM, PlatformRegion.KAKAO,
            PlatformRegion.PC_KRJP, PlatformRegion.PC_JP,
            PlatformRegion.PC_NA, PlatformRegion.PC_EU,
            PlatformRegion.PC_OC, PlatformRegion.PC_KAKAO,
            PlatformRegion.PC_SEA, PlatformRegion.PC_SA,
            PlatformRegion.PC_AS
        ];
        return pcRegions.includes(platform);
    }
}
