import * as Discord from 'discord.js';
import { CommonService as cs } from '../../services/common.service';
import { PubgService as pubgService } from '../../services/pubg.service';
import {
    SqlServerService as sqlServerService,
    SqlSeasonsService as sqlSeasonsService,
    SqlRegionsService as sqlRegionsService,
    SqlModesService as sqlModesService,
    SqlServerRegisteryService as sqlServerRegisteryService,
    SqlSqaudSizeService as sqlSqaudSizeService
} from '../../services/sql.service';
import { Player } from '../../models/player';
import { Command, CommandConfiguration, CommandHelp } from '../../models/command';
import { Seasons as SeasonEnum } from '../../enums/season.enum';
import { SquadSize as SquadSizeEnum } from '../../enums/squadSize.enum';
import { Server } from '../../models/server';


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
        usage: '<prefix>top [Number-Of-Users] [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [squadSize=(1 | 2 | 4)] [mode=(fpp | tpp)]',
        examples: [
            '!pubg-top',
            '!pubg-top season=2018-03',
            '!pubg-top season=2018-03 region=na',
            '!pubg-top season=2018-03 region=na squadSize=4',
            '!pubg-top season=2018-03 region=na squadSize=4 mode=tpp',
            '!pubg-top 5',
            '!pubg-top 5 season=2018-03',
            '!pubg-top 5 season=2018-03 region=na',
            '!pubg-top 5 season=2018-03 region=na squadSize=4',
            '!pubg-top 5 season=2018-03 region=na squadSize=4 mode=tpp'
        ]
    };

    async run(bot: any, msg: any, params: string[], perms: number) {
        let amount: number = 10;
        if (params[0] && !isNaN(+params[0])) {
            amount = +params[0];
        }
        let serverDefaults: Server = await sqlServerService.getServerDefaults(msg.guild.id);
        let season: string = cs.getParamValue('season=', params, serverDefaults.default_season);
        let region: string = cs.getParamValue('region=', params, serverDefaults.default_region);
        let mode: string = cs.getParamValue('mode=', params, serverDefaults.default_mode);
        let squadSize: string = cs.getParamValue('squadSize=', params, serverDefaults.default_squadSize);
        let checkingParametersMsg: Discord.Message = (await msg.channel.send('Checking for valid parameters ...')) as Discord.Message;

        if (!(await this.checkParameters(msg, season, region, mode, squadSize))) {
            checkingParametersMsg.delete();
            return;
        }
        let registeredPlayers: Player[] = await sqlServerRegisteryService.getRegisteredPlayersForServer(msg.guild.id);
        if (registeredPlayers.length === 0) {
            cs.handleError(msg, 'Error:: No users registered yet. Use the `addUser` command', this.help);
            return;
        }

        const batchEditAmount: number = 5;
        checkingParametersMsg.edit(`Aggregating \`top ${amount}\` on \`${registeredPlayers.length} registered users\` ... give me a second`);
        msg.channel.send('Grabbing player data')
            .then(async (msg: Discord.Message) => {
                let playersInfo: Player[] = new Array();
                for (let i = 0; i < registeredPlayers.length; i++) {
                    let player: Player = registeredPlayers[i];
                    if (i % batchEditAmount === 0) {
                        let max: number = (i + batchEditAmount) > registeredPlayers.length ? registeredPlayers.length : i + batchEditAmount;
                        msg.edit(`Grabbing data for players ${i + 1} - ${max}`);
                    }
                    let id: string = await pubgService.getCharacterID(player.username, region);
                    let characterInfo: Player = await pubgService.getPUBGCharacterData(id, player.username, season, region, +squadSize, mode);
                    // Check if character info exists for this (it wont if a user hasn't played yet)
                    if (!characterInfo) {
                        characterInfo = {
                            id: '',
                            pubg_id: id,
                            username: player.username,
                            rank: '',
                            rating: '',
                            grade: '',
                            headshot_kills: '',
                            longest_kill: '',
                            topPercent: '',
                            winPercent: '',
                            topTenPercent: '',
                            kda: '0.00',
                            kd: '0.00',
                            average_damage_dealt: '0.00',
                        };
                    }
                    playersInfo.push(characterInfo);
                }
                // Sorting Array based off of ranking (higher ranking is better)
                playersInfo.sort(function (a: Player, b: Player) { return (+b.rating) - (+a.rating); });
                let topPlayers: Player[] = playersInfo.slice(0, amount);
                let embed: Discord.RichEmbed = new Discord.RichEmbed()
                    .setTitle('Top ' + amount + ' local players')
                    .setDescription('Season:\t' + SeasonEnum[season] + '\nRegion:\t' + region.toUpperCase() + '\nMode: \t' + mode.toUpperCase() + '\nSquad Size: \t' + SquadSizeEnum[squadSize])
                    .setColor(0x00AE86)
                    .setFooter('Retrieved from https://pubg.op.gg/')
                    .setTimestamp();
                let names: string = '';
                let ratings: string = '';
                let kds: string = '';
                // Construct top strings
                for (var i = 0; i < topPlayers.length; i++) {
                    let character: Player = topPlayers[i];
                    let ratingStr: string = character.rating ? `${character.rank} / ${character.rating}` : 'Not available';
                    let kdsStr: string = `${character.kd} / ${character.kda} / ${character.average_damage_dealt}`;
                    names += character.username + '\n';
                    ratings += ratingStr + '\n';
                    kds += kdsStr + '\n';
                }
                embed.addField('Name', names, true)
                    .addField('Rank / Rating', ratings, true)
                    .addField('KD / KDA / Avg Dmg', kds, true);
                await msg.edit({ embed });
            });
    };

    async checkParameters(msg: Discord.Message, checkSeason: string, checkRegion: string, checkMode: string, checkSquadSize: string): Promise<boolean> {
        let errMessage: string = '';
        let validSeason: boolean = await pubgService.isValidSeason(checkSeason);
        let validRegion: boolean = await pubgService.isValidRegion(checkRegion);
        let validMode: boolean = await pubgService.isValidMode(checkMode);
        let validSquadSize: boolean = await pubgService.isValidSquadSize(checkSquadSize);
        if (!validSeason) {
            let seasons: any = await sqlSeasonsService.getAllSeasons();
            let availableSeasons = '== Available Seasons ==\n';
            for (let i = 0; i < seasons.length; i++) {
                if (i < seasons.length - 1) {
                    availableSeasons += seasons[i].season + ', ';
                }
                else {
                    availableSeasons += seasons[i].season;
                }
            }
            errMessage += `Error:: Invalid season parameter\n${availableSeasons}\n`;
        }
        if (!validRegion) {
            let regions: any = await sqlRegionsService.getAllRegions();
            let availableRegions: string = '== Available Regions ==\n';
            for (let i = 0; i < regions.length; i++) {
                if (i < regions.length - 1) {
                    availableRegions += regions[i].shortname + ', ';
                }
                else {
                    availableRegions += regions[i].shortname;
                }
            }
            errMessage += `\nError:: Invalid region parameter\n${availableRegions}\n`;
        }
        if (!validMode) {
            let modes: any = await sqlModesService.getAllModes();
            let availableModes: string = '== Available Modes ==\n';
            for (let i = 0; i < modes.length; i++) {
                if (i < modes.length - 1) {
                    availableModes += modes[i].shortname + ', ';
                }
                else {
                    availableModes += modes[i].shortname;
                }
            }
            errMessage += `\nError:: Invalid mode parameter\n${availableModes}\n`;
        }
        if (!validSquadSize) {
            let squadSizes: any = await sqlSqaudSizeService.getAllSquadSizes();
            let availableSizes: string = '== Available Squad Sizes ==\n';
            for (let i = 0; i < squadSizes.length; i++) {
                if (i < squadSizes.length - 1) {
                    availableSizes += squadSizes[i].size + ', ';
                }
                else {
                    availableSizes += squadSizes[i].size;
                }
            }
            errMessage += `\nError:: Invalid squad size parameter\n${availableSizes}\n`;
        }
        if (!validSeason || !validRegion || !validMode || !validSquadSize) {
            cs.handleError(msg, errMessage, this.help);
            return false;
        }
        return true;
    }
}

