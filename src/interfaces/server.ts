export interface Server {
    id: string;
    serverId: string;
    default_bot_prefix: string;
    default_season: string;
    default_region: string;
    default_mode: string;
    isStoredInDb: boolean;
}
