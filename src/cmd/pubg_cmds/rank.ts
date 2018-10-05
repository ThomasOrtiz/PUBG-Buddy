import * as Discord from 'discord.js';
import {
    AnalyticsService as analyticsService,
    CommonService as cs,
    DiscordMessageService as discordMessageService,
    ImageService as imageService,
    PubgService as pubgApiService,
    SqlServerService as sqlServerService,
    SqlUserRegisteryService as sqlUserRegisteryService
} from '../../services';
import { Command, CommandConfiguration, CommandHelp, DiscordClientWrapper } from '../../entities';
import { PubgAPI, PlatformRegion, PlayerSeason, Player, GameModeStats } from 'pubg-typescript-api';
import Jimp = require('jimp');
import { ImageLocation, FontLocation } from '../../shared/constants';


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
            '!pubg-rank john season=2018-03 region=eu',
            '!pubg-rank john season=2018-03 region=na mode=tpp',
            '!pubg-rank john region=as mode=tpp season=2018-03',
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
        const isValidParameters = await pubgApiService.validateParameters(msg, this.help, this.paramMap.season, this.paramMap.region, this.paramMap.mode);
        if(!isValidParameters) {
            checkingParametersMsg.delete();
            return;
        }

        const message: Discord.Message = await checkingParametersMsg.edit(`Getting data for \`${this.paramMap.username}\``);

        const pubgPlayersApi: PubgAPI = new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion[this.paramMap.region]);
        const players: Player[] = await pubgApiService.getPlayerByName(pubgPlayersApi, [this.paramMap.username]);

        if(players.length === 0) {
            message.edit(`Could not find \`${this.paramMap.username}\` on the \`${this.paramMap.region}\` region. Double check the username and region.`);
            return;
        }
        const player: Player = players[0];
        if (!player.id) {
            message.edit(`Could not find \`${this.paramMap.username}\` on the \`${this.paramMap.region}\` region. Double check the username and region.`);
            return;
        }

        // Get Player Data
        let seasonData: PlayerSeason;
        try {
            const seasonStatsApi: PubgAPI = pubgApiService.getSeasonStatsApi(PlatformRegion[this.paramMap.region], this.paramMap.season);
            seasonData = await pubgApiService.getPlayerSeasonStatsById(seasonStatsApi, player.id, this.paramMap.season);
        } catch(e) {
            message.edit(`Could not find \`${this.paramMap.username}\`'s \`${this.paramMap.season}\` stats.`);
            return;
        }

        if(this.paramMap.useText) {
            // Create base embed to send
            let embed: Discord.RichEmbed = await this.createBaseEmbed();
            this.addDefaultStats(embed, seasonData);

            // Send the message and setup reactions
            this.setupReactions(message, originalPoster, seasonData);
            message.edit({ embed });
        } else {
            let attatchment: Discord.Attachment = await this.addDefaultImageStats(seasonData);
            let msg = await message.channel.send(attatchment) as Discord.Message;
            this.setupReactions(msg, originalPoster, seasonData);
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
        let username: string;

        // Try to get username from user registery
        if(!params[0] || cs.stringContains(params[0], '=')) {
            username = await sqlUserRegisteryService.getRegisteredUser(msg.author.id);
        }

        // Check if user had registered name, if not check if supplied
        if(!username) {
            username = params[0];
        }

        // Throw error if no username supplied
        if(!username) {
            discordMessageService.handleError(msg, 'Error:: Must specify a username or register with `register` command', this.help);
            throw 'Error:: Must specify a username';
        }

        const indexOfUseText : number = cs.isSubstringOfElement('=text', params);
        if(indexOfUseText > 0) { params.splice(indexOfUseText, 1); }

        if (msg.guild) {
            const serverDefaults = await sqlServerService.getServerDefaults(msg.guild.id);

            paramMap = {
                username: username,
                season: cs.getParamValue('season=', params, serverDefaults.default_season),
                region: cs.getParamValue('region=', params, serverDefaults.default_region).toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, serverDefaults.default_mode).toUpperCase().replace('-', '_'),
                useText: indexOfUseText >= 0
            }
        } else {
            const currentSeason: string = (await pubgApiService.getCurrentSeason(new PubgAPI(cs.getEnvironmentVariable('pubg_api_key'), PlatformRegion.PC_NA))).id.split('division.bro.official.')[1];
            paramMap = {
                username: username,
                season: cs.getParamValue('season=', params, currentSeason),
                region: cs.getParamValue('region=', params, 'pc_na').toUpperCase().replace('-', '_'),
                mode: cs.getParamValue('mode=', params, 'solo_fpp').toUpperCase().replace('-', '_'),
                useText: indexOfUseText >= 0
            }
        }

        analyticsService.track(this.help.name, {
            distinct_id: msg.author.id,
            discord_id: msg.author.id,
            discord_username: msg.author.tag,
            number_parameters: params.length,
            pubg_name: username,
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

        one_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 1`, {
                pubg_name: this.paramMap.username,
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
                this.addSpecificDataToEmbed(embed, seasonData.soloFPPStats, 'Solo FPP');
                this.addSpecificDataToEmbed(embed, seasonData.soloStats, 'Solo TPP');
                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImage(seasonData.soloFPPStats, seasonData.soloStats, 'Solo');

                if(msg.deletable) {
                    one_collector.removeAllListeners();
                    await msg.delete();
                }

                let newMsg = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        });
        two_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 2`, {
                pubg_name: this.paramMap.username,
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
                this.addSpecificDataToEmbed(embed, seasonData.duoFPPStats, 'Duo FPP');
                this.addSpecificDataToEmbed(embed, seasonData.duoStats, 'Duo TPP');
                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImage(seasonData.duoFPPStats, seasonData.duoStats, 'Duo');

                if(msg.deletable) {
                    two_collector.removeAllListeners();
                    await msg.delete();
                }

                let newMsg = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        });
        four_collector.on('collect', async (reaction: Discord.MessageReaction, reactionCollector: Discord.Collector<string, Discord.MessageReaction>) => {
            analyticsService.track(`${this.help.name} - Click 4`, {
                pubg_name: this.paramMap.username,
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
                this.addSpecificDataToEmbed(embed, seasonData.squadFPPStats, 'Squad FPP');
                this.addSpecificDataToEmbed(embed, seasonData.squadStats, 'Squad TPP');

                await msg.edit(warningMessage, { embed });
            } else {
                let attatchment: Discord.Attachment = await this.createImage(seasonData.squadFPPStats, seasonData.squadStats, 'Squad');

                if(msg.deletable) {
                    four_collector.removeAllListeners();
                    await msg.delete();
                }

                let newMsg = await msg.channel.send(attatchment) as Discord.Message;
                this.setupReactions(newMsg, originalPoster, seasonData);
            }
        });

        one_collector.on('end', collected => { msg.clearReactions().catch(() => {}); });
        two_collector.on('end', collected => { msg.clearReactions().catch(() => {}); });
        four_collector.on('end', collected => { msg.clearReactions().catch(() => {}); });
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
        const overallRating = cs.round(pubgApiService.calculateOverallRating(playerData.winPoints, playerData.killPoints), 0) || 'NA';
        const kd = cs.round(playerData.kills / playerData.losses) || 0;
        const kda = cs.round((playerData.kills + playerData.assists) / playerData.losses) || 0;
        const winPercent = cs.getPercentFromFraction(playerData.wins, playerData.roundsPlayed);
        const topTenPercent = cs.getPercentFromFraction(playerData.top10s, playerData.roundsPlayed);
        const averageDamageDealt = cs.round(playerData.damageDealt / playerData.roundsPlayed) || 0;

        let killStats: string = `
        \`KD:\` ${kd}
        \`KDA:\` ${kda}
        \`Kills:\` ${playerData.kills}
        \`Assists:\` ${playerData.assists}
        \`DBNOs:\` ${playerData.dBNOs}
        \`Suicides:\` ${playerData.suicides}
        \`Headshots:\` ${playerData.headshotKills}
        \`Longest kill:\` ${playerData.longestKill.toFixed(2)}
        \`Road kill:\` ${playerData.roadKills}
        `;

        let gameStats: string = `
        \`Total Damage Dealt:\` ${playerData.damageDealt.toFixed(2)}
        \`Average damage dealt:\` ${averageDamageDealt}
        \`Longest time survived:\` ${playerData.longestTimeSurvived.toFixed(2)}
        \`Walk distance:\` ${playerData.walkDistance.toFixed(2)}
        \`Ride distance:\` ${playerData.rideDistance.toFixed(2)}
        \`Vehicles Destroyed:\` ${playerData.vehicleDestroys}
        `;

        let winStats: string = `
        \`Win %:\` ${winPercent}
        \`Wins:\` ${playerData.wins}
        \`Top 10 %:\` ${topTenPercent}
        \`Top 10s:\`  ${playerData.top10s}
        \`Matches Played:\`  ${playerData.roundsPlayed}
        `;

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
        if(!fppStatsImage && !tppStatsImage) {
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
        if (pubgApiService.isPlatformXbox(platform) || (pubgApiService.isPlatformPC(platform) && pubgApiService.isPreSeasonTen(this.paramMap.season))) {
            overallRating = cs.round(pubgApiService.calculateOverallRating(fppStats.winPoints, fppStats.killPoints), 0) || 'NA';
        } else {
            overallRating = cs.round(fppStats.rankPoints, 0) || 'NA';
            badge = (await imageService.loadImage(pubgApiService.getRankBadgeImageFromRanking(fppStats.rankPoints))).clone();
            rankTitle = pubgApiService.getRankTitleFromRanking(fppStats.rankPoints);
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

