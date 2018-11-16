import { CommonService as cs } from '..';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';
import { PubgSeasonService } from './season.service';

const apiKey: string = cs.getEnvironmentVariable('pubg_api_key');

export class PubgPlatformService {

    static getApi(platform: PlatformRegion): PubgAPI {
        if (this.isPlatformXbox(platform)) {
            return new PubgAPI(apiKey, PlatformRegion.XBOX);
        }

        const isKakao: boolean = platform === PlatformRegion.PC_KAKAO || platform === PlatformRegion.KAKAO;
        if (this.isPlatformPC(platform) && isKakao) {
            return new PubgAPI(apiKey, PlatformRegion.KAKAO);
        } else {
            return new PubgAPI(apiKey, PlatformRegion.STEAM);
        }
    }

    static getSeasonStatsApi(platform: PlatformRegion, season: string): PubgAPI {
        const isPC: boolean = this.isPlatformPC(platform);

        if (this.isPlatformXbox(platform) || (isPC && PubgSeasonService.isPreSeasonTen(season))) {
            return new PubgAPI(apiKey, platform);
        }

        const isKakao: boolean = platform === PlatformRegion.PC_KAKAO || platform === PlatformRegion.KAKAO;
        if (isPC && isKakao) {
            return new PubgAPI(apiKey, PlatformRegion.KAKAO);
        } else {
            return new PubgAPI(apiKey, PlatformRegion.STEAM);
        }
    }

    static getPlatformDisplayName(platform: PlatformRegion): string {
        if (this.isPlatformXbox(platform)) {
            return PlatformRegion.XBOX;
        }

        const isKakao: boolean = platform === PlatformRegion.PC_KAKAO || platform === PlatformRegion.KAKAO;
        if (this.isPlatformPC(platform) && isKakao) {
            return PlatformRegion.KAKAO;
        } else {
            return PlatformRegion.STEAM;
        }
    }

    static isPlatformXbox(platform: PlatformRegion): boolean {
        const xboxRegions: PlatformRegion[] = [
            PlatformRegion.XBOX_AS, PlatformRegion.XBOX_EU,
            PlatformRegion.XBOX_NA, PlatformRegion.XBOX_OC,
            PlatformRegion.XBOX_SA, PlatformRegion.XBOX
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
