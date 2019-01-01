import { CommonService } from '..';
import { PubgAPI, PlatformRegion } from '../../pubg-typescript-api';
import { PubgSeasonService } from './season.service';

const apiKey: string = CommonService.getEnvironmentVariable('pubg_api_key');

export class PubgPlatformService {

    static getApi(platform: PlatformRegion): PubgAPI {
        if (this.isPlatformXbox(platform)) {
            return new PubgAPI(apiKey, PlatformRegion.XBOX);
        }

        if (this.isPlatformPlaystation(platform)) {
            return new PubgAPI(apiKey, PlatformRegion.PSN);
        }

        if (this.isPlatformPC(platform) && this.isPlatformKakao(platform)) {
            return new PubgAPI(apiKey, PlatformRegion.KAKAO);
        } else {
            return new PubgAPI(apiKey, PlatformRegion.STEAM);
        }
    }

    static getSeasonStatsApi(platform: PlatformRegion, season: string): PubgAPI {
        const isPC: boolean = this.isPlatformPC(platform);

        if (this.isPlatformXbox(platform) || this.isPlatformPlaystation(platform) || (isPC && PubgSeasonService.isPreSeasonTen(season))) {
            return new PubgAPI(apiKey, platform);
        }

        if (isPC && this.isPlatformKakao(platform)) {
            return new PubgAPI(apiKey, PlatformRegion.KAKAO);
        } else {
            return new PubgAPI(apiKey, PlatformRegion.STEAM);
        }
    }

    static getPlatformDisplayName(platform: PlatformRegion): string {
        if (this.isPlatformXbox(platform)) {
            return PlatformRegion.XBOX;
        }

        if (this.isPlatformPlaystation(platform)) {
            return PlatformRegion.PSN;
        }

        if (this.isPlatformPC(platform) && this.isPlatformKakao(platform)) {
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

    static isPlatformPlaystation(platform: PlatformRegion): boolean {
        const xboxRegions: PlatformRegion[] = [
            PlatformRegion.PSN_AS, PlatformRegion.PSN_EU,
            PlatformRegion.PSN_NA, PlatformRegion.PSN_OC,
            PlatformRegion.PSN
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

    static isPlatformKakao(platform: PlatformRegion): boolean {
        const kakaoRegions: PlatformRegion[] = [PlatformRegion.KAKAO, PlatformRegion.PC_KAKAO];
        return kakaoRegions.includes(platform);
    }
}
