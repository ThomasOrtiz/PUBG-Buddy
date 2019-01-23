import * as Discord from 'discord.js';
import {
    AnalyticsService,
    CommonService,
    DiscordMessageService,
    ImageService,
    ParameterService,
    PubgPlatformService, PubgPlayerService, PubgRatingService, PubgValidationService,
    SqlServerService,
    SqlServerRegisteryService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { IPlayer, IServer, PubgParameters } from '../../interfaces';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats, Season } from '../../pubg-typescript-api';
import Jimp = require('jimp');
import { ImageLocation, FontLocation, CommonMessages } from '../../shared/constants';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


interface ParameterMap {
    amount: number;
    season: string;
    region: string;
    mode: string;
}

class PlayerWithSeasonData {
    constructor(name: string, seasonData: PlayerSeason) {
        this.name = name;
        this.seasonData = seasonData;
    }

    readonly name: string;
    readonly seasonData: PlayerSeason;
}

class PlayerWithGameModeStats {
    constructor(name: string, gameModeStats: GameModeStats) {
        this.name = name;
        this.gameModeStats = gameModeStats;
    }

    readonly name: string;
    readonly gameModeStats: GameModeStats;
}


export class Top extends Command {

    conf: CommandConfiguration = {
        group: 'PUBG',
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'top',
        description: `Gets the top "x" players registered in the server. Players that haven't played this season are excluded.`,
        usage: '<prefix>top [Number-Of-Users] [season=] [region=] [mode=]',
        examples: [
            '!pubg-top',
            '!pubg-top season=2018-03',
            '!pubg-top season=2018-03 region=pc-na',
            '!pubg-top season=2018-03 region=pc-na',
            '!pubg-top season=2018-03 region=pc-na mode=solo',
            '!pubg-top 5',
            '!pubg-top 5 season=2018-03',
            '!pubg-top 5 season=2018-03 region=pc-na',
            '!pubg-top 5 season=2018-03 region=pc-na',
            '!pubg-top 5 season=2018-03 region=pc-na mode=duo-fpp'
        ]
    };

    private paramMap: ParameterMap;
    private registeredUsers: IPlayer[];

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const originalPoster: Discord.User = msg.author;
        this.paramMap = await this.getParameters(msg, params);

        let reply: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await PubgValidationService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if (!isValidParameters) {
            reply.delete();
            return;
        }

        this.registeredUsers = await SqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        if (this.registeredUsers.length === 0) {
            DiscordMessageService.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command', this.help);
            return;
        }

        await reply.edit(`Aggregating **Top ${this.paramMap.amount}** on **${this.registeredUsers.length} registered users** ... give me a second`);

        // Get list of ids
        reply.edit(`${reply.content}\nGetting player data ...`);
        const registeredNames: string[] = this.registeredUsers.map(user => user.username);
        const players: Player[] = await this.getPlayerInfoByBatching(registeredNames);

        // Retrieve Season data for player
        let playerSeasons: PlayerWithSeasonData[] = await this.getPlayersSeasonData(players);

        reply.edit(`${reply.content}\nCreating the leaderboard ...`);
        const attatchment: Discord.Attachment = await this.createImages(playerSeasons, this.paramMap.mode);

        await reply.delete();
        const imgMessage: Discord.Message = await msg.channel.send(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
        this.setupReactions(imgMessage, originalPoster, playerSeasons);
    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let amount: number = 10;
        if (params[0] && !isNaN(+params[0])) {
            amount = +params[0];
        }

        const serverDefaults: IServer = await SqlServerService.getServer(msg.guild.id);
        const pubg_params: PubgParameters = await ParameterService.getPubgParameters(params.join(' '), msg.author.id, false, serverDefaults);

        if (!pubg_params.season) {
            const seasonObj: Season = await PubgSeasonService.getCurrentSeason(PubgPlatformService.getApi(PlatformRegion[pubg_params.region]));
            pubg_params.season = PubgSeasonService.getSeasonDisplayName(seasonObj);
        }

        const paramMap: ParameterMap = {
            amount : amount,
            season: pubg_params.season,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
            mode: pubg_params.mode.toUpperCase().replace('-', '_')
        }

        AnalyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            server_id: msg.guild.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode
        });

        return paramMap;
    }

    /**
     * Returns PUBG Player[] by batching
     * @param {string[]} names list of names
     * @returns {Promise<Player[]>}
     */
    private async getPlayerInfoByBatching(names: string[]): Promise<Player[]> {
        let players: Player[] = new Array<Player>();
        const api: PubgAPI = PubgPlatformService.getApi(PlatformRegion[this.paramMap.region]);

        const batches: Array<string[]> = CommonService.chunkArray(names, 5);
        let requests: Array<Promise<Player[]>> = [];

        for (let i = 0; i < batches.length; i++) {
            requests.push(PubgPlayerService.getPlayersByName(api, batches[i]));
        }

        const results: Array<Player[]> = await Promise.all(requests);
        for (let i = 0; i < results.length; i++) {
            players = [...players, ...results[i]];
        }

        return players;
    }

    /**
     * Returns a promise of PlayerWithSeasonData[]
     * @param {Discord.Message} msg
     * @param {Player[]} players list of PUBG Players
     * @returns {Promise<PlayerWithSeasonData[]>}
     */
    private async getPlayersSeasonData(players: Player[]): Promise<PlayerWithSeasonData[]> {
        let playerSeasons: PlayerWithSeasonData[] = new Array();
        const seasonStatsApi: PubgAPI = PubgPlatformService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);

        let requests: Array<Promise<PlayerSeason>> = [];
        for (let i = 0; i < players.length; i++) {
            requests.push(PubgPlayerService.getPlayerSeasonStatsById(seasonStatsApi, players[i].id, this.paramMap.season));
        }

        const results: PlayerSeason[] = await Promise.all(requests);
        for (let i = 0; i < results.length; i++) {
            if (!results[i]) { continue; }
            const player = players[i];
            const info = new PlayerWithSeasonData(player.name, results[i]);
            playerSeasons.push(info);
        }

        return playerSeasons;
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     * @param {PlayerSeason} seasonData
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User, players: PlayerWithSeasonData[]): Promise<void> {
        const onOneCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            AnalyticsService.track(`${this.help.name} - Click 1`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = await msg.channel.send('Creating the leaderboard ...') as Discord.Message;
            const attatchment: Discord.Attachment = await this.createImages(players, 'solo');

            await reply.delete();
            const newMsg: Discord.Message = await msg.channel.send(`${warningMessage}**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
            this.setupReactions(newMsg, originalPoster, players);
        };
        const onTwoCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            AnalyticsService.track(`${this.help.name} - Click 2`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });

            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = await msg.channel.send('Creating the leaderboard ...') as Discord.Message;
            const attatchment: Discord.Attachment = await this.createImages(players, 'duo');

            await reply.delete();
            const newMsg: Discord.Message = await msg.channel.send(`${warningMessage}**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
            this.setupReactions(newMsg, originalPoster, players);
        };
        const onFourCollect: Function = async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            AnalyticsService.track(`${this.help.name} - Click 4`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode
            });

            let warningMessage: string = '';
            await reaction.remove(originalPoster).catch(async (err) => {
                if (!msg.guild) { return; }
                warningMessage = CommonMessages.REACTION_WARNING;
            });


            if (msg.deletable) {
                await msg.delete().catch(() => {});
            }

            let reply: Discord.Message = await msg.channel.send('Creating the leaderboard ...') as Discord.Message;
            const attatchment: Discord.Attachment = await this.createImages(players, 'squad');

            await reply.delete();
            const newMsg: Discord.Message = await msg.channel.send(`${warningMessage}**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
            this.setupReactions(newMsg, originalPoster, players);
        };
        DiscordMessageService.setupReactions(msg, originalPoster, onOneCollect, onTwoCollect, onFourCollect);
    }

    /**
     * Give a mode, return the dict key relevant to that mode
     * @param {string} mode
     * @returns {string} dictionary key for stat to get
     */
    private getWhichStatsToGet(mode: string): string {
        switch (mode) {
            case 'SOLO':
                return 'soloStats';
            case 'SOLO_FPP':
                return 'soloFPPStats';
            case 'DUO':
                return 'duoStats';
            case 'DUO_FPP':
                return 'duoFPPStats';
            case 'SQUAD':
                return 'squadStats';
            case 'SQUAD_FPP':
                return 'squadFPPStats';
        }
    }

    //////////////////////////////////////
    // Image
    //////////////////////////////////////

    private async createImages(players: PlayerWithSeasonData[], mode: string): Promise<Discord.Attachment> {
        let createImagePromises: Promise<Jimp>[] = [];

        if (CommonService.stringContains(mode, 'solo', true)) {
            createImagePromises.push(this.createImage(players, 'SOLO_FPP'));
            createImagePromises.push(this.createImage(players, 'SOLO'));
        } else if (CommonService.stringContains(mode, 'duo', true)) {
            createImagePromises.push(this.createImage(players, 'DUO_FPP'));
            createImagePromises.push(this.createImage(players, 'DUO'));
        } else if (CommonService.stringContains(mode, 'squad', true)) {
            createImagePromises.push(this.createImage(players, 'SQUAD_FPP'));
            createImagePromises.push(this.createImage(players, 'SQUAD'));
        }
        const createImageResolved = await Promise.all(createImagePromises);

        const fppImg: Jimp = createImageResolved[0];
        const tppImg: Jimp = createImageResolved[1];

        let image: Jimp = new Jimp(0, 0);
        if (fppImg) {
            image = ImageService.combineImagesVertically(image, fppImg);
        }
        if (tppImg) {
            image = ImageService.combineImagesVertically(image, tppImg);
        }

        // Create/Merge error message
        if (!fppImg && !tppImg) {
            const black_header: Jimp = await ImageService.loadImage(ImageLocation.BLACK_1200_130);
            const errMessageImage: Jimp = await this.addNoMatchesPlayedText(black_header.clone(), mode);
            image = ImageService.combineImagesVertically(image, errMessageImage);
        }

        const imageBuffer: Buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new Discord.Attachment(imageBuffer);
    }

    private async createImage(playerSeasons: PlayerWithSeasonData[], mode: string): Promise<Jimp> {
        let baseHeaderImg: Jimp = await ImageService.loadImage(ImageLocation.TOP_BANNER);
        let baseImg: Jimp = await ImageService.loadImage(ImageLocation.TOP_BODY_SINGLE);

        const headerImg: Jimp = await this.addHeaderImageText(baseHeaderImg.clone(), mode);
        const bodyImg: Jimp = await this.stitchBody(baseImg.clone(), playerSeasons, mode);

        if (!bodyImg) { return null; }

        return ImageService.combineImagesVertically(headerImg, bodyImg);
    }

    private async addHeaderImageText(img: Jimp, mode: string): Promise<Jimp> {
        const imageWidth: number = img.getWidth();
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_64: Jimp.Font =  await ImageService.loadFont(FontLocation.TEKO_BOLD_WHITE_72);
        const font_48: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_WHITE_48);
        let textWidth: number;

        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        const gameModeSplit: string[] = mode.split('_');
        let gameModeDescription: string = gameModeSplit[0];
        gameModeDescription += (gameModeSplit.length == 2) ? ` ${gameModeSplit[1]}` : '';

        textObj.text = `Top ${this.paramMap.amount} - ${gameModeDescription}`;
        img.print(font_64, 30, 20, textObj);

        textObj.text = regionDisplayName;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 10, textObj);

        textObj.text = this.paramMap.season;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 60, textObj);

        return img;
    }

    private async stitchBody(img: Jimp, players: PlayerWithSeasonData[], mode: string): Promise<Jimp> {
        const topPlayers: PlayerWithGameModeStats[] = this.orderSeasonStats(players, mode);

        if (!topPlayers) { return null; }

        let image: Jimp = new Jimp(0, 0);

        const imagePromises: Array<Promise<Jimp>> = [];
        for (let i = 0; i < topPlayers.length; i++) {
            imagePromises.push(this.addBodyTextToImage(img.clone(), topPlayers[i]));
        }

        const images: Jimp[] = await Promise.all(imagePromises);

        for (let i = 0; i < images.length; i++) {
            image = ImageService.combineImagesVertically(image, images[i]);
        }

        return image;
    }

    private orderSeasonStats(players: PlayerWithSeasonData[], mode: string): PlayerWithGameModeStats[] {
        const statsToGetKey = this.getWhichStatsToGet(mode);

        // Create UserInfo array with specific season data
        let userInfo: PlayerWithGameModeStats[] = new Array();
        for (let i = 0; i < players.length; i++) {
            const data: PlayerWithSeasonData = players[i];
            if (!data.seasonData) { continue; }
            const info = new PlayerWithGameModeStats(data.name, data.seasonData[statsToGetKey]);
            if (info.gameModeStats.roundsPlayed === 0) { continue; }
            userInfo.push(info);
        }

        if (userInfo.length === 0) { return null; }

        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];
        if (PubgSeasonService.isOldSeason(platform, this.paramMap.season)) {
            userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
                const overallRatingB = PubgRatingService.calculateOverallRating(b.gameModeStats.winPoints, b.gameModeStats.killPoints);
                const overallRatingA = PubgRatingService.calculateOverallRating(a.gameModeStats.winPoints, a.gameModeStats.killPoints);
                return (+overallRatingB) - (+overallRatingA);
            });
        } else {
            userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
                const overallRatingB = PubgRatingService.calculateOverallRating(b.gameModeStats.rankPoints, b.gameModeStats.rankPoints);
                const overallRatingA = PubgRatingService.calculateOverallRating(a.gameModeStats.rankPoints, a.gameModeStats.rankPoints);
                return (+overallRatingB) - (+overallRatingA);
            });
        }

        // Grab only the top 'x' players
        return userInfo.slice(0, this.paramMap.amount);
    }

    private async addBodyTextToImage(img: Jimp, playerSeason: PlayerWithGameModeStats): Promise<Jimp> {
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const body_font: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_ORANGE_42);
        const username_font: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_BLACK_42);
        const titleLevelFont: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_BOLD_BLACK_24);

        const x_centers : any = {
            username: 90,
            rating: 519,
            ratingBadge: 595,
            winsOverGames: 687,
            kd: 818,
            kda: 935,
            averageDamageDealt: 1061.5,
        }
        const body_y: number = 7;
        let textWidth: number;

        const seasonStats: GameModeStats = playerSeason.gameModeStats;
        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];

        let overallRating: string;
        let badge: Jimp;
        let titleLevel: string = '';

        const isOldSeason: boolean = PubgSeasonService.isOldSeason(platform, this.paramMap.season);
        if (isOldSeason) {
            overallRating = CommonService.round(PubgRatingService.calculateOverallRating(seasonStats.winPoints, seasonStats.killPoints), 0) || 'NA';
        } else if (PubgPlatformService.isPlatformPC(platform) && this.paramMap.season === 'pc-2018-01') {
            overallRating = CommonService.round(seasonStats.rankPoints, 0) || 'NA';
            badge = (await ImageService.loadImage(PubgRatingService.getRankBadgeImageFromRanking(seasonStats.rankPoints))).clone();
        } else if (this.paramMap.season === 'lifetime') {
            overallRating = 'NA';
        } else {
            const rankPointsTitle: string = seasonStats.rankPointsTitle;
            overallRating = CommonService.round(seasonStats.rankPoints, 0) || 'NA';
            badge = (await ImageService.loadImage(PubgRatingService.getSurvivalTitleBadgeImage(rankPointsTitle))).clone();

            const titleComponents: string[] = rankPointsTitle.split('-');
            const level: number = +titleComponents[1];
            titleLevel = PubgRatingService.romanizeNumber(level);
        }

        const username : string = playerSeason.name;
        const rating: string = overallRating;
        let winsOverGames: string = `${seasonStats.wins}/${seasonStats.roundsPlayed}`;
        const kd = CommonService.round(seasonStats.kills / seasonStats.losses) || 0;
        const kda = CommonService.round((seasonStats.kills + seasonStats.assists) / seasonStats.losses) || 0;
        let averageDamageDealt = CommonService.round(seasonStats.damageDealt / seasonStats.roundsPlayed) || 0;
        averageDamageDealt = +averageDamageDealt
        averageDamageDealt = averageDamageDealt.toFixed(0);


        textObj.text = username;
        textWidth = Jimp.measureText(username_font, textObj.text);
        textObj.alingmentX = Jimp.HORIZONTAL_ALIGN_LEFT;
        img.print(username_font, x_centers.username, body_y, textObj);

        textObj.alingmentX = Jimp.HORIZONTAL_ALIGN_CENTER;

        textObj.text = `${rating}`
        textWidth = Jimp.measureText(body_font, textObj.text);
        img.print(body_font, x_centers.rating-(textWidth/2), body_y, textObj);

        if (badge) {
            let scale = 0.50;
            if (PubgRatingService.getRankTitleFromRanking(+overallRating) === 'GrandMaster') {
                scale = 0.40;
            }
            badge.scale(scale);
            img.composite(badge, x_centers.ratingBadge-(badge.getWidth()/2), 0);
        }

        if (titleLevel) {
            textObj.text = `${titleLevel}`
            textWidth = Jimp.measureText(titleLevelFont, textObj.text);
            img.print(titleLevelFont, x_centers.ratingBadge-(textWidth/2)+25, body_y+35, textObj);
        }

        textObj.text = `${winsOverGames}`
        textWidth = Jimp.measureText(body_font, textObj.text);
        img.print(body_font, x_centers.winsOverGames-(textWidth/2), body_y, textObj);

        textObj.text = `${kd}`
        textWidth = Jimp.measureText(body_font, textObj.text);
        img.print(body_font, x_centers.kd-(textWidth/2), body_y, textObj);

        textObj.text = `${kda}`
        textWidth = Jimp.measureText(body_font, textObj.text);
        img.print(body_font, x_centers.kda-(textWidth/2), body_y, textObj);

        textObj.text = `${+averageDamageDealt}`
        textWidth = Jimp.measureText(body_font, textObj.text);
        img.print(body_font, x_centers.averageDamageDealt-(textWidth/2), body_y, textObj);

        return img;
    }

    private async addNoMatchesPlayedText(img: Jimp, mode: string): Promise<Jimp> {
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_64: Jimp.Font =  await ImageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_64);
        const font_32: Jimp.Font = await ImageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_48);


        // Add top header
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');
        const gameModeSplit: string[] = mode.split('_');
        let gameModeDescription: string = `${gameModeSplit[0]}s`;

        let imageWidth: number = img.getWidth();
        let textWidth: number;

        let headerImg = img.clone();
        textObj.text = `Top ${this.paramMap.amount} - ${gameModeDescription}`;
        headerImg.print(font_64, 20, 30, textObj);

        textObj.text = regionDisplayName;
        textWidth = Jimp.measureText(font_32, textObj.text);
        headerImg.print(font_32, imageWidth-textWidth-25, 20, textObj);

        textObj.text = this.paramMap.season;
        textWidth = Jimp.measureText(font_32, textObj.text);
        headerImg.print(font_32, imageWidth-textWidth-25, 70, textObj);

        // Add warning message
        const warningImg = img.clone();
        textObj.text = `Players haven\'t played "${gameModeDescription}" games this season`;
        textWidth = Jimp.measureText(font_32, textObj.text);
        warningImg.print(font_32, (img.getWidth()/2)-(textWidth/2), img.getHeight()/2 - 15, textObj);

        return ImageService.combineImagesVertically(headerImg, warningImg);
    }
}
