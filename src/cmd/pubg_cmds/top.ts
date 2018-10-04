import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    ImageService as imageService,
    PubgService as pubgApiService,
    SqlServerService as sqlServerService,
    SqlServerRegisteryService as sqlServerRegisteryService,
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { Player as User } from '../../interfaces';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';
import Jimp = require('jimp');
import { ImageLocation, FontLocation } from '../../shared/constants';


interface ParameterMap {
    amount: number;
    season: string;
    region: string;
    mode: string;
    useText: boolean;
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
        enabled: true,
        guildOnly: true,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'top',
        description: 'Gets the top "x" players registered in the server',
        usage: '<prefix>top [Number-Of-Users] [season=] [region=] [mode=] [=text]',
        examples: [
            '!pubg-top',
            '!pubg-top =text',
            '!pubg-top season=2018-03',
            '!pubg-top season=2018-03 region=na',
            '!pubg-top season=2018-03 region=na',
            '!pubg-top season=2018-03 region=na mode=tpp',
            '!pubg-top 5',
            '!pubg-top 5 season=2018-03',
            '!pubg-top 5 season=2018-03 region=na',
            '!pubg-top 5 season=2018-03 region=na',
            '!pubg-top 5 season=2018-03 region=na mode=tpp'
        ]
    };

    private paramMap: ParameterMap;
    private registeredUsers: User[];
    private batchEditAmount: number = 5;

    async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const originalPoster: Discord.User = msg.author;
        this.paramMap = await this.getParameters(msg, params);

        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        this.registeredUsers = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        if (this.registeredUsers.length === 0) {
            discordMessageService.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command', this.help);
            return;
        }

        checkingParametersMsg.edit(`Aggregating \`top ${this.paramMap.amount}\` on \`${this.registeredUsers.length} registered users\` ... give me a second`);

        msg.channel.send('Grabbing player data').then(async (msg: Discord.Message) => {
            // Get list of ids
            const registeredNames: string[] = this.registeredUsers.map(user => user.username);
            const players: Player[] = await this.getPlayerInfoByBatching(registeredNames);

            // Retrieve Season data for player
            let playerSeasons: PlayerWithSeasonData[] = await this.getPlayersSeasonData(msg, players);

            if(this.paramMap.useText) {
                let embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addDefaultStats(embed, playerSeasons);

                // Send the message and setup reactions
                this.setupReactions(msg, originalPoster, playerSeasons);
                msg.edit({ embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImages(playerSeasons, this.paramMap.mode);
                let imgMessage = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(imgMessage, originalPoster, playerSeasons);
            }
        });
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

        const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
        const indexOfUseText : number = cs.isSubstringOfElement('=text', params);
        if(indexOfUseText > 0) { params.splice(indexOfUseText, 1); }

        const paramMap: ParameterMap = {
            amount : amount,
            season: cs.getParamValue('season=', params, serverDefaults.default_season),
            region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
            mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_'),
            useText: indexOfUseText >= 0
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode,
            useText: paramMap.useText
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
        const batchAmount: number = 5;
        const pubgPlayersApi: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);

        let currBatch: string[] = names.splice(0, batchAmount);
        while (currBatch.length > 0) {
            const batchedPlayers: Player[] = await pubgApiService.getPlayerByName(pubgPlayersApi, currBatch);
            players = [...players, ...batchedPlayers];

            currBatch = names.splice(0, batchAmount);
        }

        return players;
    }

    /**
     * Returns a promise of PlayerWithSeasonData[]
     * @param {Discord.Message} msg
     * @param {Player[]} players list of PUBG Players
     * @returns {Promise<PlayerWithSeasonData[]>}
     */
    private async getPlayersSeasonData(msg: Discord.Message, players: Player[]): Promise<PlayerWithSeasonData[]> {
        let playerSeasons: PlayerWithSeasonData[] = new Array();
        const seasonStatsApi: PubgAPI = pubgApiService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);

        for(let i = 0; i < players.length; i++) {
            const player = players[i];
            const currentId = player.id;

            if (i % this.batchEditAmount === 0) {
                let max: number = ((i + this.batchEditAmount) > this.registeredUsers.length) ? this.registeredUsers.length : i + this.batchEditAmount;
                msg.edit(`Grabbing data for players ${i + 1} - ${max}`);
            }

            try {
                const seasonInfo: PlayerSeason = await pubgApiService.getPlayerSeasonStatsById(seasonStatsApi, currentId, this.paramMap.season);
                const info = new PlayerWithSeasonData(player.name, seasonInfo);
                playerSeasons.push(info);
            } catch(e) {
                // player hasn't played this season
            }

        }

        return playerSeasons;
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private addDefaultStats(embed: Discord.RichEmbed, players: PlayerWithSeasonData[]): void {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            this.addSpecificDataToEmbed(embed, players, 'SOLO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SOLO');
        } else if (cs.stringContains(mode, 'duo', true)) {
            this.addSpecificDataToEmbed(embed, players, 'DUO_FPP');
            this.addSpecificDataToEmbed(embed, players, 'DUO');
        } else if (cs.stringContains(mode, 'squad', true)) {
            this.addSpecificDataToEmbed(embed, players, 'SQUAD_FPP');
            this.addSpecificDataToEmbed(embed, players, 'SQUAD');
        }
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     * @param {PlayerSeason} seasonData
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User, players: PlayerWithSeasonData[]): Promise<void> {
        const reaction_numbers = ["\u0030\u20E3","\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"]
        await msg.react(reaction_numbers[1]);
        await msg.react(reaction_numbers[2]);
        await msg.react(reaction_numbers[4]);

        const one_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[1] && originalPoster.id === user.id;
        const two_filter: Discord.CollectorFilter = (reaction, user) =>  reaction.emoji.name === reaction_numbers[2] && originalPoster.id === user.id;
        const four_filter: Discord.CollectorFilter = (reaction, user) => reaction.emoji.name === reaction_numbers[4] && originalPoster.id === user.id;

        const one_collector: Discord.ReactionCollector = msg.createReactionCollector(one_filter, { time: 15*1000 });
        const two_collector: Discord.ReactionCollector = msg.createReactionCollector(two_filter, { time: 15*1000 });
        const four_collector: Discord.ReactionCollector = msg.createReactionCollector(four_filter, { time: 15*1000 });

        one_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            analyticsService.track(`${this.help.name} - Click 1`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            if(this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, players, 'SOLO_FPP');
                this.addSpecificDataToEmbed(embed, players, 'SOLO');

                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImages(players, 'solo');

                if(msg.deletable) {
                    one_collector.removeAllListeners();
                    await msg.delete();
                }


                let newMsg: Discord.Message = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, players);
            }
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            analyticsService.track(`${this.help.name} - Click 2`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            if(this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, players, 'DUO_FPP');
                this.addSpecificDataToEmbed(embed, players, 'DUO');

                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImages(players, 'duo');

                if(msg.deletable) {
                    two_collector.removeAllListeners();
                    await msg.delete();
                }

                let newMsg: Discord.Message = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, players);
            }
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector) => {
            analyticsService.track(`${this.help.name} - Click 4`, {
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            let warningMessage;
            await reaction.remove(originalPoster).catch(async (err) => {
                if(!msg.guild) { return; }
                warningMessage = ':warning: Bot is missing the `Text Permissions > Manage Messages` permission. Give permission for the best experience. :warning:';
            });

            if(this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, players, 'SQUAD_FPP');
                this.addSpecificDataToEmbed(embed, players, 'SQUAD');

                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImages(players, 'squad');

                if(msg.deletable) {
                    four_collector.removeAllListeners();
                    await msg.delete();
                }

                let newMsg: Discord.Message = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, players);
            }
        });

        one_collector.on('end', collected => msg.clearReactions());
        two_collector.on('end', collected => msg.clearReactions());
        four_collector.on('end', collected => msg.clearReactions());
    }

    /**
     * Creates the base embed that the command will respond with
     * @returns {Promise<Discord.RichEmbed} a new RichEmbed with the base information for the command
     */
    private async createBaseEmbed(): Promise<Discord.RichEmbed> {
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, this.paramMap.season);
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
                .setTitle('Top ' + this.paramMap.amount + ' local players')
                .setDescription(`Season:\t ${seasonDisplayName}\nRegion:\t${regionDisplayName}`)
                .setColor(0x00AE86)
                .setFooter(`Using PUBG's official API`)
                .setTimestamp()

        return embed;
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addSpecificDataToEmbed(embed: Discord.RichEmbed, players: PlayerWithSeasonData[], gameMode: string): void {
        this.addEmbedFields(embed, gameMode, players);
    }

    /**
     * Add the game mode data to the embed
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private async addEmbedFields(embed: Discord.RichEmbed, gameMode: string, players: PlayerWithSeasonData[]) {
        const statsToGetKey: string = this.getWhichStatsToGet(gameMode);

        // Create UserInfo array with specific season data
        let userInfo: PlayerWithGameModeStats[] = new Array();
        for(let i = 0; i < players.length; i++) {
            const data: PlayerWithSeasonData = players[i];
            const info = new PlayerWithGameModeStats(data.name, data.seasonData[statsToGetKey]);
            userInfo.push(info);
        }

        // Sorting Array based off of ranking (higher ranking is better)
        userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
            const overallRatingB = pubgApiService.calculateOverallRating(b.gameModeStats.winPoints, b.gameModeStats.killPoints);
            const overallRatingA = pubgApiService.calculateOverallRating(a.gameModeStats.winPoints, a.gameModeStats.killPoints);
            return (+overallRatingB) - (+overallRatingA);
        });

        // Grab only the top 'x' players
        let topPlayers: PlayerWithGameModeStats[] = userInfo.slice(0, this.paramMap.amount);

        // Construct top strings
        let names: string = '';
        let ratings: string = '';
        let kds: string = '';

        for (let i = 0; i < topPlayers.length; i++) {
            const playerInfo = topPlayers[i];
            const seasonStats: GameModeStats = playerInfo.gameModeStats;

            if(seasonStats.roundsPlayed === 0) { continue; }

            const overallRating = cs.round(pubgApiService.calculateOverallRating(seasonStats.winPoints, seasonStats.killPoints), 0);
            const kd = cs.round(seasonStats.kills / seasonStats.losses) || 0;
            const kda = cs.round((seasonStats.kills + seasonStats.assists) / seasonStats.losses) || 0;
            const averageDamageDealt = cs.round(seasonStats.damageDealt / seasonStats.roundsPlayed) || 0;
            const ratingStr: string = overallRating ? `${overallRating}` : 'Not available';
            const kdsStr: string    = `${kd} / ${kda} / ${averageDamageDealt}`;

            names += `${playerInfo.name}\n`;
            ratings += `${ratingStr}\n`;
            kds += `${kdsStr}\n`;
        }

        const gameModeSplit: string[] = gameMode.split('_');
        let gameModeDescription: string = gameModeSplit[0];
        gameModeDescription += (gameModeSplit.length == 2) ? ` ${gameModeSplit[1]}` : '';

        if(names.length === 0) { return; }

        embed.addBlankField();
        embed.addField('Game Type', gameModeDescription);
        embed.addField('Name', names, true);
        embed.addField('Rating', ratings, true);
        embed.addField('KD / KDA / Avg Dmg', kds, true);
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
        let fppImg: Jimp;
        let tppImg: Jimp;
        if (cs.stringContains(mode, 'solo', true)) {
            fppImg = await this.createImage(players, 'SOLO_FPP');
            tppImg = await this.createImage(players, 'SOLO');
        } else if (cs.stringContains(mode, 'duo', true)) {
            fppImg = await this.createImage(players, 'DUO_FPP');
            tppImg = await this.createImage(players, 'DUO');
        } else if (cs.stringContains(mode, 'squad', true)) {
            fppImg = await this.createImage(players, 'SQUAD_FPP');
            tppImg = await this.createImage(players, 'SQUAD');
        }

        let image: Jimp = new Jimp(0, 0);
        if (fppImg) {
            image = imageService.combineImagesVertically(image, fppImg);
        }
        if (tppImg) {
            image = imageService.combineImagesVertically(image, tppImg);
        }

        // Create/Merge error message
        if(!fppImg && !tppImg) {
            const black_header: Jimp = await imageService.loadImage(ImageLocation.BLACK_1200_130);
            const errMessageImage: Jimp = await this.addNoMatchesPlayedText(black_header.clone(), mode);
            image = imageService.combineImagesVertically(image, errMessageImage);
        }

        const imageBuffer: Buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new Discord.Attachment(imageBuffer);
    }

    private async createImage(playerSeasons: PlayerWithSeasonData[], mode: string): Promise<Jimp> {
        let baseHeaderImg: Jimp = await imageService.loadImage(ImageLocation.TOP_BANNER);
        let baseImg: Jimp = await imageService.loadImage(ImageLocation.TOP_BODY_SINGLE);

        const headerImg: Jimp = await this.addHeaderImageText(baseHeaderImg.clone(), mode);
        const bodyImg: Jimp = await this.stitchBody(baseImg.clone(), playerSeasons, mode);

        if (!bodyImg) { return null; }

        return imageService.combineImagesVertically(headerImg, bodyImg);
    }

    private async addHeaderImageText(img: Jimp, mode: string): Promise<Jimp> {
        const imageWidth: number = img.getWidth();
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_64: Jimp.Font =  await imageService.loadFont(FontLocation.TEKO_BOLD_WHITE_72);
        const font_48: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_WHITE_48);
        let textWidth: number;

        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, this.paramMap.season);
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        const gameModeSplit: string[] = mode.split('_');
        let gameModeDescription: string = gameModeSplit[0];
        gameModeDescription += (gameModeSplit.length == 2) ? ` ${gameModeSplit[1]}` : '';

        textObj.text = `Top ${this.paramMap.amount} - ${gameModeDescription}`;
        img.print(font_64, 30, 20, textObj);

        textObj.text = regionDisplayName;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 10, textObj);

        textObj.text = seasonDisplayName;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 60, textObj);

        return img;
    }

    private async stitchBody(img: Jimp, players: PlayerWithSeasonData[], mode: string): Promise<Jimp> {
        const statsToGetKey = this.getWhichStatsToGet(mode);

        // Create UserInfo array with specific season data
        let userInfo: PlayerWithGameModeStats[] = new Array();
        for(let i = 0; i < players.length; i++) {
            const data: PlayerWithSeasonData = players[i];
            if(!data.seasonData) { continue; }
            const info = new PlayerWithGameModeStats(data.name, data.seasonData[statsToGetKey]);
            if(info.gameModeStats.roundsPlayed === 0) { continue; }
            userInfo.push(info);
        }

        if(userInfo.length === 0) { return null; }

        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];
        if (pubgApiService.isPlatformXbox(platform) || (pubgApiService.isPlatformPC(platform) && pubgApiService.isPreSeasonTen(this.paramMap.season))) {
            // Sorting Array based off of ranking (higher ranking is better)
            userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
                const overallRatingB = pubgApiService.calculateOverallRating(b.gameModeStats.winPoints, b.gameModeStats.killPoints);
                const overallRatingA = pubgApiService.calculateOverallRating(a.gameModeStats.winPoints, a.gameModeStats.killPoints);
                return (+overallRatingB) - (+overallRatingA);
            });
        } else {
            userInfo.sort((a: PlayerWithGameModeStats, b: PlayerWithGameModeStats) => {
                const overallRatingB = pubgApiService.calculateOverallRating(b.gameModeStats.rankPoints, b.gameModeStats.rankPoints);
                const overallRatingA = pubgApiService.calculateOverallRating(a.gameModeStats.rankPoints, a.gameModeStats.rankPoints);
                return (+overallRatingB) - (+overallRatingA);
            });
        }

        // Grab only the top 'x' players
        let topPlayers: PlayerWithGameModeStats[] = userInfo.slice(0, this.paramMap.amount);

        // Combine pictures
        let image: Jimp = new Jimp(0, 0);
        for(let i = 0; i < topPlayers.length; i++) {
            let bodyImage: Jimp = await this.addBodyTextToImage(img.clone(), topPlayers[i]);
            image = imageService.combineImagesVertically(image, bodyImage);
        }

        return image;
    }

    private async addBodyTextToImage(img: Jimp, playerSeason: PlayerWithGameModeStats): Promise<Jimp> {
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const body_font: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_ORANGE_42);
        const username_font: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_BLACK_42);

        const x_centers : any = {
            username: 90,
            rating: 519,
            ratingBadge: 605,
            winsOverGames: 687,
            kd: 818,
            kda: 935,
            averageDamageDealt: 1061.5,
        }
        const body_y: number = 5;
        let textWidth: number;

        const seasonStats: GameModeStats = playerSeason.gameModeStats;
        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];

        let overallRating;
        let badge: Jimp;
        if (pubgApiService.isPlatformXbox(platform) || (pubgApiService.isPlatformPC(platform) && pubgApiService.isPreSeasonTen(this.paramMap.season))) {
            overallRating = cs.round(pubgApiService.calculateOverallRating(seasonStats.winPoints, seasonStats.killPoints), 0) || 'NA';
        } else {
            overallRating = cs.round(seasonStats.rankPoints, 0);
            badge = (await imageService.loadImage(pubgApiService.getRankBadgeImageFromRanking(overallRating))).clone();
        }

        const username : string = playerSeason.name;
        const rating: string = overallRating;
        let winsOverGames: string = `${seasonStats.wins}/${seasonStats.roundsPlayed}`;
        const kd = cs.round(seasonStats.kills / seasonStats.losses) || 0;
        const kda = cs.round((seasonStats.kills + seasonStats.assists) / seasonStats.losses) || 0;
        let averageDamageDealt = cs.round(seasonStats.damageDealt / seasonStats.roundsPlayed) || 0;
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
            badge.scale(0.5);
            img.composite(badge, x_centers.ratingBadge-(badge.getWidth()/2), -2);
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
        const font_64: Jimp.Font =  await imageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_64);
        const font_32: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_48);


        // Add top header
        const api: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const seasonDisplayName: string = await pubgApiService.getSeasonDisplayName(api, this.paramMap.season);
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

        textObj.text = seasonDisplayName;
        textWidth = Jimp.measureText(font_32, textObj.text);
        headerImg.print(font_32, imageWidth-textWidth-25, 70, textObj);

        // Add warning message
        const warningImg = img.clone();
        textObj.text = `Players haven\'t played "${gameModeDescription}" games this season`;
        textWidth = Jimp.measureText(font_32, textObj.text);
        warningImg.print(font_32, (img.getWidth()/2)-(textWidth/2), img.getHeight()/2 - 15, textObj);

        return imageService.combineImagesVertically(headerImg, warningImg);
    }
}
