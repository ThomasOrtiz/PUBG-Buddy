import { PlatformRegion } from '../../pubg-typescript-api';

export class PubgRegionService {

    static getPubgRegionFromInput(region: string): string {
        const pubg_region: string = Object.keys(PlatformRegion).find(key => PlatformRegion[key] === region) as PlatformRegion;
        return pubg_region;
    }

    static getAvailableRegions(): string[] {
        return Object.values(PlatformRegion);
    }

}
