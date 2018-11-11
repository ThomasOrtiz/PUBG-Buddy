import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    ImageService as imageService,
    ParameterService as parameterService,
    PubgPlatformService, PubgPlayerService, PubgRatingService, PubgValidationService,
    SqlServerService as sqlServerService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';
import Jimp = require('jimp');
import { ImageLocation, FontLocation } from '../../shared/constants';
import { PubgParameters } from '../../interfaces';
import { PubgSeasonService } from '../../services/pubg-api/season.service';


interface ParameterMap {
    username: string;
    season: string;
    region: string;
    mode: string;
    useText: boolean;
}

export class Rank extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'rank',
        description: 'Returns a players solo, duo, and squad ranking details. Username IS case sensitive.',
        usage: '<prefix>rank [pubg username] [season=] [region=] [mode=] [=text]',
        examples: [
            '!pubg-rank        (only valid if you have used the `register` command)',
            '!pubg-rank john',
            '!pubg-rank john season=2018-03',
            '!pubg-rank john season=2018-03 region=pc-eu',
            '!pubg-rank john season=2018-03 region=pc-na mode=solo-fpp',
            '!pubg-rank john region=pc-as mode=duo season=2018-03',
            '!pubg-rank john =all  (this will show in a text based format instead of the image)'
        ]
    };

    private paramMap: ParameterMap;

    public async run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number) {
        const originalPoster: Discord.User = msg.author;

        try {
            this.paramMap = await this.getParameters(msg, params);
        } catch(e) {
            return;
        }

        const checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;
        const isValidParameters = await PubgValidationService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if (!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for **${this.paramMap.username}**`);

        const pubgPlayersApi: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const players: Player[] = await PubgPlayerService.getPlayerByName(pubgPlayersApi, [this.paramMap.username]);

        if (players.length === 0) {
            message.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }
        const player: Player = players[0];
        if (!player.id) {
            message.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }

        // Get Player Data
        let seasonData: PlayerSeason;
        try {
            const seasonStatsApi: PubgAPI = PubgPlatformService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);
            seasonData = await PubgPlayerService.getPlayerSeasonStatsById(seasonStatsApi, player.id, this.paramMap.season);
        } catch(e) {
            message.edit(`Could not find **${this.paramMap.username}** on the \`${this.paramMap.region}\` region for the \`${this.paramMap.season}\` season. Double check the username, region, and ensure you've played this season.`);
            return;
        }

        if (this.paramMap.useText) {
            // Create base embed to send
            let embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addDefaultStats(embed, seasonData);

            // Send the message and setup reactions
            this.setupReactions(message, originalPoster, seasonData);
            message.edit(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, { embed });
        } else {
            const attatchment: Discord.Attachment = await this.addDefaultImageStats(seasonData);
            const imageReply: Discord.Message = await message.channel.send(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
            this.setupReactions(imageReply, originalPoster, seasonData);
        }

    };

    /**
     * Retrieves the paramters for the command
     * @param {Discord.Message} msg
     * @param {string[]} params
     * @returns {Promise<ParameterMap>}
     */
    private async getParameters(msg: Discord.Message, params: string[]): Promise<ParameterMap> {
        let paramMap: ParameterMap;

        const indexOfUseText : number = cs.isSubstringOfElement('=text', params);
        if (indexOfUseText >= 0) { params.splice(indexOfUseText, 1); }

        let pubg_params: PubgParameters;
        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);
            pubg_params = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true, serverDefaults);
        } else {
            pubg_params = await parameterService.getPubgParameters(params.join(' '), msg.author.id, true);
        }

        // Throw error if no username supplied
        if (!pubg_params.username) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username or register with `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        paramMap = {
            username: pubg_params.username,
            season: pubg_params.season,
            region: pubg_params.region.toUpperCase().replace('-', '_'),
            mode: pubg_params.mode.toUpperCase().replace('-', '_'),
            useText: indexOfUseText >= 0
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: paramMap.username,
            season: paramMap.season,
            region: paramMap.region,
            mode: paramMap.mode,
            useText: paramMap.useText
        });

        return paramMap;
    }

    private async addDefaultImageStats(seasonData: PlayerSeason): Promise<Discord.Attachment> {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            return await this.createImage(seasonData.soloFPPStats, seasonData.soloStats, 'Solo');
        } else if (cs.stringContains(mode, 'duo', true)) {
            return await this.createImage(seasonData.duoFPPStats, seasonData.duoStats, 'Duo');
        } else if (cs.stringContains(mode, 'squad', true)) {
            return await this.createImage(seasonData.squadFPPStats, seasonData.squadStats, 'Squad');
        }
    }

    /**
     * Depending on the user's default mode get one of three stats
     * @param {Discord.RichEmbed} embed
     * @param {PlayerSeason} seasonData
     */
    private addDefaultStats(embed: Discord.RichEmbed, seasonData: PlayerSeason): void {
        let mode = this.paramMap.mode;

        if (cs.stringContains(mode, 'solo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.soloFPPStats, 'Solo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.soloStats, 'Solo TPP');
        } else if (cs.stringContains(mode, 'duo', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.duoFPPStats, 'Duo FPP');
            this.addSpecificDataToEmbed(embed, seasonData.duoStats, 'Duo TPP');
        } else if (cs.stringContains(mode, 'squad', true)) {
            this.addSpecificDataToEmbed(embed, seasonData.squadFPPStats, 'Squad FPP');
            this.addSpecificDataToEmbed(embed, seasonData.squadStats, 'Squad TPP');
        }
    }

    /**
     * Adds reaction collectors and filters to make interactive messages
     * @param {Discord.Message} msg
     * @param {Discord.User} originalPoster
     * @param {PlayerSeason} seasonData
     */
    private async setupReactions(msg: Discord.Message, originalPoster: Discord.User, seasonData: PlayerSeason): Promise<void> {
        const onOneCollect: Function = async () => {
            analyticsService.track(`${this.help.name} - Click 1`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            if (this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, seasonData.soloFPPStats, 'Solo FPP');
                this.addSpecificDataToEmbed(embed, seasonData.soloStats, 'Solo TPP');
                await msg.edit('', { embed });
            } else {
                const attatchment: Discord.Attachment = await this.createImage(seasonData.soloFPPStats, seasonData.soloStats, 'Solo');

                if (msg.deletable) {
                    await msg.delete().catch(() => {});
                }

                const newMsg = await msg.channel.send(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        };
        const onTwoCollect: Function = async () => {
            analyticsService.track(`${this.help.name} - Click 2`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            if (this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, seasonData.duoFPPStats, 'Duo FPP');
                this.addSpecificDataToEmbed(embed, seasonData.duoStats, 'Duo TPP');
                await msg.edit('', { embed });
            } else {
                const attatchment: Discord.Attachment = await this.createImage(seasonData.duoFPPStats, seasonData.duoStats, 'Duo');

                if (msg.deletable) {
                    await msg.delete().catch(() => {});
                }

                const newMsg = await msg.channel.send(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        };
        const onFourCollect: Function = async () => {
            analyticsService.track(`${this.help.name} - Click 4`, {
                pubg_name: this.paramMap.username,
                season: this.paramMap.season,
                region: this.paramMap.region,
                mode: this.paramMap.mode,
                useText: this.paramMap.useText
            });

            if (this.paramMap.useText) {
                const embed: Discord.RichEmbed = await this.createBaseEmbed();
                this.addSpecificDataToEmbed(embed, seasonData.squadFPPStats, 'Squad FPP');
                this.addSpecificDataToEmbed(embed, seasonData.squadStats, 'Squad TPP');

                await msg.edit('', { embed });
            } else {
                const attatchment: Discord.Attachment = await this.createImage(seasonData.squadFPPStats, seasonData.squadStats, 'Squad');

                if (msg.deletable) {
                    await msg.delete().catch(() => {});
                }

                const newMsg = await msg.channel.send(`**${originalPoster.username}**, use the **1**, **2**, and **4** **reactions** to switch between **Solo**, **Duo**, and **Squad**.`, attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        };
        discordMessageService.setupReactions(msg, originalPoster, onOneCollect, onTwoCollect, onFourCollect);
    }

    /**
     * Creates the base embed that the command will respond with
     * @returns {Promise<Discord.RichEmbed} a new RichEmbed with the base information for the command
     */
    private async createBaseEmbed(): Promise<Discord.RichEmbed> {
        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        let embed: Discord.RichEmbed = new Discord.RichEmbed()
            .setTitle('Ranking: ' + this.paramMap.username)
            .setDescription(`Season:\t${this.paramMap.season}\nRegion:\t${regionDisplayName}`)
            .setColor(0x00AE86)
            .setFooter(`Using PUBG's official API`)
            .setTimestamp();

        return embed;
    }

    /**
     * Adds game stats to the embed
     * @param {Discord.RichEmbed} embed
     * @param {GameModeStats} soloData
     * @param {GameModeStats} duoData
     * @param {GameModeStats} squadData
     */
    private addSpecificDataToEmbed(embed: Discord.RichEmbed, data: GameModeStats, type: string): void {
        if (data.roundsPlayed > 0) {
            this.addEmbedFields(embed, type, data);
        } else {
            embed.addBlankField(false);
            embed.addField(`${type} Status`, `Player hasn\'t played ${type} games this season`, false);
        }
    }

    /**
     * Add the game mode data to the embed
     * @param {Discord.Message} embed
     * @param {string} gameMode
     * @param {GameModeStats} playerData
     */
    private addEmbedFields(embed: Discord.RichEmbed, gameMode: string, playerData: GameModeStats): void {
        let overallRating;
        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];
        if (PubgPlatformService.isPlatformXbox(platform) || (PubgPlatformService.isPlatformPC(platform) && PubgSeasonService.isPreSeasonTen(this.paramMap.season))) {
            overallRating = cs.round(PubgRatingService.calculateOverallRating(playerData.winPoints, playerData.killPoints), 0) || 'NA';
        } else {
            overallRating = cs.round(playerData.rankPoints, 0) || 'NA';
        }

        const kd = cs.round(playerData.kills / playerData.losses) || 0;
        const kda = cs.round((playerData.kills + playerData.assists) / playerData.losses) || 0;
        const winPercent = cs.getPercentFromFraction(playerData.wins, playerData.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(playerData.top10s, playerData.roundsPlayed);
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed) || 0;

        let killStats: string = cs.multiLineStringNoLeadingWhitespace`
            \`KD:\` ${kd}
            \`KDA:\` ${kda}
            \`Kills:\` ${playerData.kills}
            \`Assists:\` ${playerData.assists}
            \`DBNOs:\` ${playerData.dBNOs}
            \`Suicides:\` ${playerData.suicides}
            \`Headshots:\` ${playerData.headshotKills}
            \`Longest kill:\` ${playerData.longestKill.toFixed(2)}
            \`Road kill:\` ${playerData.roadKills}`;

        let gameStats: string = cs.multiLineStringNoLeadingWhitespace`
            \`Total Damage Dealt:\` ${playerData.damageDealt.toFixed(2)}
            \`Average damage dealt:\` ${averageDamageDealt}
            \`Longest time survived:\` ${playerData.longestTimeSurvived.toFixed(2)}
            \`Walk distance:\` ${playerData.walkDistance.toFixed(2)}
            \`Ride distance:\` ${playerData.rideDistance.toFixed(2)}
            \`Vehicles Destroyed:\` ${playerData.vehicleDestroys}`;

        let winStats: string = cs.multiLineStringNoLeadingWhitespace`
            \`Win %:\` ${winPercent}
            \`Wins:\` ${playerData.wins}
            \`Top 10 %:\` ${topTenPercent}
            \`Top 10s:\`  ${playerData.top10s}
            \`Matches Played:\`  ${playerData.roundsPlayed}`;

        embed.addBlankField();
        embed.addField(`${gameMode} Rating`, overallRating, false)
        embed.addField('Kill stats', killStats, true);
        embed.addField('Game stats', gameStats, true);
        embed.addField('Win stats', winStats);
    }

    //////////////////////////////////////
    // Image
    //////////////////////////////////////

    private async createImage(fppStats: GameModeStats, tppStats: GameModeStats, mode: string): Promise<Discord.Attachment> {
        let baseHeaderImg: Jimp = await imageService.loadImage(ImageLocation.BLACK_1050_130);
        let baseImg: Jimp = await imageService.loadImage(ImageLocation.RANK_BODY);

        const baseImageWidth = baseImg.getWidth();
        const baseImageHeight = baseImg.getHeight();

        // Create parts of final image
        const headerImg: Jimp = await this.addHeaderImageText(baseHeaderImg.clone());
        let fppStatsImage: Jimp;
        let tppStatsImage: Jimp;
        if (fppStats.roundsPlayed > 0) {
            fppStatsImage = await this.addBodyTextToImage(baseImg.clone(), fppStats, `${mode} FPP`);
        }
        if (tppStats.roundsPlayed > 0) {
            tppStatsImage = await this.addBodyTextToImage(baseImg.clone(), tppStats, `${mode}`);
        }

        // Merge parts together
        let image: Jimp = headerImg.clone();
        let heightTally = image.getHeight();
        if (fppStatsImage) {
            const newHeight = heightTally + baseImageHeight;
            let newCanvas = new Jimp(baseImageWidth, newHeight);
            newCanvas.composite(image, 0, 0);

            image = newCanvas.composite(fppStatsImage, 0, heightTally);
            heightTally = image.getHeight();
        }
        if (tppStatsImage) {
            const newHeight = heightTally + baseImageHeight;
            let newCanvas = new Jimp(baseImageWidth, newHeight);
            newCanvas.composite(image, 0, 0);

            image = newCanvas.composite(tppStatsImage, 0, heightTally);
            heightTally = image.getHeight();
        }

        // Create/Merge error message
        if (!fppStatsImage && !tppStatsImage) {
            const errMessageImage: Jimp = await this.addNoMatchesPlayedText(baseHeaderImg.clone(), mode);
            image = imageService.combineImagesVertically(image ,errMessageImage);
        }

        const imageBuffer: Buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new Discord.Attachment(imageBuffer);
    }

    private async addNoMatchesPlayedText(img: Jimp, mode: string): Promise<Jimp> {
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_32: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_32);

        textObj.text = `Player hasn\'t played "${mode}" games this season`;
        const textWidth = Jimp.measureText(font_32, textObj.text);
        img.print(font_32, (img.getWidth()/2)-(textWidth/2), img.getHeight()/2 - 15, textObj);

        return img;
    }

    private async addHeaderImageText(img: Jimp): Promise<Jimp> {
        const imageWidth: number = img.getWidth();
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_64: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_WHITE_72);
        const font_48: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_WHITE_48);
        let textWidth: number;

        const regionDisplayName: string = this.paramMap.region.toUpperCase().replace('_', '-');

        textObj.text = this.paramMap.username;
        img.print(font_64, 30, 20, textObj);

        textObj.text = regionDisplayName;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 10, textObj);

        textObj.text = this.paramMap.season;
        textWidth = Jimp.measureText(font_48, textObj.text);
        img.print(font_48, imageWidth-textWidth-25, 60, textObj);

        return img;
    }

    private async addBodyTextToImage(img: Jimp, fppStats: GameModeStats, mode: string): Promise<Jimp> {
        const imageWidth: number = img.getWidth();
        const textObj: any = {
            text: '',
            alingmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
        const font_48_white: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_REGULAR_WHITE_48);
        const font_48_orange: Jimp.Font = await imageService.loadFont(FontLocation.TEKO_BOLD_ORANGE_40);
        let textWidth: number;

        const body_subheading_x: number = 50;
        const body_subheading_y: number = 5;
        const body_top_y: number = 95;
        const body_mid_y: number = 245;
        const body_bottom_y: number = 395;

        const platform: PlatformRegion = PlatformRegion[this.paramMap.region];

        let overallRating;
        let badge: Jimp;
        let rankTitle: string;
        if (PubgPlatformService.isPlatformXbox(platform) || (PubgPlatformService.isPlatformPC(platform) && PubgSeasonService.isPreSeasonTen(this.paramMap.season))) {
            overallRating = cs.round(PubgRatingService.calculateOverallRating(fppStats.winPoints, fppStats.killPoints), 0) || 'NA';
        } else {
            overallRating = cs.round(fppStats.rankPoints, 0) || 'NA';
            badge = (await imageService.loadImage(PubgRatingService.getRankBadgeImageFromRanking(fppStats.rankPoints))).clone();
            rankTitle = PubgRatingService.getRankTitleFromRanking(fppStats.rankPoints);
        }
        const kd = cs.round(fppStats.kills / fppStats.losses) || 0;
        const kda = cs.round((fppStats.kills + fppStats.assists) / fppStats.losses) || 0;
        const winPercent = cs.getPercentFromFraction(fppStats.wins, fppStats.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(fppStats.top10s, fppStats.roundsPlayed);
        const averageDamageDealt = cs.round(fppStats.damageDealt / fppStats.roundsPlayed) || 0;

        let x_centers : any = {
            kd: 174,
            winPercent: 404,
            topTenPercent: 645.5,
            averageDamageDealt: 881,
            kda: 171.5,
            kills: 407.5,
            assists: 644,
            dBNOs: 882.5,
            longestKill: 287.5,
            headshotKills: 762.6
        }

        // Sub Heading
        textObj.text = `${mode} - ${overallRating}`;
        textWidth = Jimp.measureText(font_48_white, textObj.text);
        img.print(font_48_white, body_subheading_x+10, body_subheading_y, textObj);

        if (badge) {
            img.composite(badge, 525-(badge.getWidth()/2), 380);
            textObj.text = rankTitle;
            textWidth = Jimp.measureText(font_48_orange, textObj.text);
            img.print(font_48_orange, 525-(textWidth/2), 360, textObj);
        }

        textObj.text = `${fppStats.wins}`;
        textWidth = Jimp.measureText(font_48_white, textObj.text);
        img.print(font_48_white, 510-textWidth, body_subheading_y, textObj);

        textObj.text = `${fppStats.top10s}`;
        textWidth = Jimp.measureText(font_48_white, textObj.text);
        img.print(font_48_white, 685-textWidth, body_subheading_y, textObj);

        textObj.text = `${fppStats.roundsPlayed}`;
        textWidth = Jimp.measureText(font_48_white, textObj.text);
        img.print(font_48_white, imageWidth-textWidth-180, body_subheading_y, textObj);

        // Body - Top
        textObj.text = `${kd}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.kd-(textWidth/2), body_top_y, textObj);

        textObj.text = `${winPercent}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.winPercent-(textWidth/2), body_top_y, textObj);

        textObj.text = `${topTenPercent}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.topTenPercent-(textWidth/2), body_top_y, textObj);

        textObj.text = `${averageDamageDealt}`;;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.averageDamageDealt-(textWidth/2), body_top_y, textObj);

        // Body - Middle
        textObj.text = `${kda}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.kda-(textWidth/2), body_mid_y, textObj);

        textObj.text = `${fppStats.kills}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.kills-(textWidth/2), body_mid_y, textObj);

        textObj.text = `${fppStats.assists}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.assists-(textWidth/2), body_mid_y, textObj);

        textObj.text = `${fppStats.dBNOs}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.dBNOs-(textWidth/2), body_mid_y, textObj);

        // Body - Bottom
        textObj.text = `${fppStats.longestKill.toFixed(2)}m`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.longestKill-(textWidth/2), body_bottom_y, textObj);

        textObj.text = `${fppStats.headshotKills}`;
        textWidth = Jimp.measureText(font_48_orange, textObj.text);
        img.print(font_48_orange, x_centers.headshotKills-(textWidth/2), body_bottom_y, textObj);

        return img;
    }
}

