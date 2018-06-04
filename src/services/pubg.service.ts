import * as rp from 'request-promise';
import * as logger from 'winston';
import * as cheerio from 'cheerio';
import { CommonService as cs } from './common.service';
import {
    SqlPlayersService as sqlPlayersService,
    SqlModesService as sqlModeService,
    SqlRegionsService as sqlRegionService,
    SqlSqaudSizeService as sqlSquadSizeService,
    SqlSeasonsService as sqlSeasonService
 } from './sql.service';
import { Player } from '../models/player';
const curl = require('curlrequest');

// Webscraping URL --> pubgBaseRL + <username> + pubgServer
const pubgBaseURL: string = 'https://pubg.op.gg/user/';
const pubgServer: string = '?server=';
// Direct API URL --> apiURL + <id> + apiOptions
const apiURL: string = 'https://pubg.op.gg/api/users/';
const apiOptions: string = '/ranked-stats';


export class PubgService {

    /**
     * Returns a pubg character id
     * @param {string} username
     * @param {string} region: region
     * @returns {Promise<string>} a promise that resolves to a pubg id
     */
    static async getCharacterID(username: string, region: string): Promise<string> {
        username = username.toLowerCase();

        return sqlPlayersService.getPlayer(username)
            .then((player) => {
                if(player && player.pubg_id && player.pubg_id !== '') {
                    return player.pubg_id;
                } else {
                    return this.webScrapeForId(username, region);
                }
            });
    }

    /**
     * Using curl this scrapes pubg.op.gg for pubg character id.
     * @param {string} username: pubg username
     * @param {string} region: region
     * @returns {Promise<any>}
     */
    static async webScrapeForId(username: string, region: string): Promise<any> {
        logger.info(`\tWebscraping for ${username} on the ${region} region`);

        let url: string = pubgBaseURL + username + pubgServer + region;
        return new Promise((resolve, reject) => {
            curl.request(url, async (err, stdout) => {
                if(err) { reject(err); }

                let $: any = cheerio.load(stdout);
                let id: string = $('#userNickname').attr('data-user_id');
                if(id) {
                    await sqlPlayersService.addPlayer(username, id);
                }

                resolve(id);
            });
        });
    }

    /**
     * Makes a api call to pubg.op.gg/api/
     * @param {string} id: pubg api id
     * @param {string} username: pubg username
     * @param {string} season: season of pubg ['2018-01', '2018-02', '2018-03']
     * @param {string} region: region of play
     * @param {string} squadSize: solo, duo, squad [1, 2, 4]
     * @param {string} mode: [fpp, tpp]
     * @returns {Promise<Player>} A promise that resolves to a player
     */
    static async getPUBGCharacterData(id: string, username: string, season: string, region: string, squadSize: number, mode: string): Promise<Player> {
        logger.info('\tApi call for ' + username);

        const url = apiURL + id + apiOptions + '?season=' + season + '&server=' + region + '&queue_size=' + squadSize + '&mode=' + mode;
        return rp({ url: url, json: true })
            .then((json) => {
                let player: Player = {
                    id: '',
                    pubg_id: id,
                    username: username,
                    rank: `#${json.ranks.rating}`,
                    rating: json.stats.rating || '',
                    grade: json.grade || '?',
                    headshot_kills: cs.getPercentFromFraction(json.stats.headshot_kills_sum, json.stats.kills_sum),
                    longest_kill: json.stats.longest_kill_max + 'm',
                    average_damage_dealt: cs.round(json.stats.damage_dealt_avg ),
                    topPercent: 'Top ' + cs.getPercentFromFraction(json.ranks.rating, json.max_ranks.rating),
                    winPercent: cs.getPercentFromFraction(json.stats.win_matches_cnt, json.stats.matches_cnt),
                    topTenPercent: cs.getPercentFromFraction(json.stats.topten_matches_cnt, json.stats.matches_cnt),
                    kda: cs.round( (json.stats.kills_sum + json.stats.assists_sum) / json.stats.deaths_sum ),
                    kd: cs.round(json.stats.kills_sum/ json.stats.deaths_sum),
                }

                return player;
            }, () => {
                return null;
            });
    }

    static async isValidSeason(checkSeason): Promise<boolean> {
        let seasons = await sqlSeasonService.getAllSeasons();
        for(let i = 0; i < seasons.length; i++) {
            if(seasons[i].season === checkSeason) return true;
        }
        return false;
    }

    static async isValidRegion(checkRegion): Promise<boolean> {
        let regions = await sqlRegionService.getAllRegions();
        for(let i = 0; i < regions.length; i++) {
            if(regions[i].shortname === checkRegion) return true;
        }
        return false;
    }

    static async isValidMode(checkMode): Promise<boolean> {
        let modes = await sqlModeService.getAllModes();
        for(let i = 0; i < modes.length; i++) {
            if(modes[i].shortname === checkMode) return true;
        }
        return false;
    }

    static async isValidSquadSize(checkSize): Promise<boolean> {
        if(!(+checkSize)) {
            return false;
        }
        checkSize = +checkSize;
        let squadSizes = await sqlSquadSizeService.getAllSquadSizes();
        for(let i = 0; i < squadSizes.length; i++) {
            if(squadSizes[i].size === checkSize) return true;
        }
        return false;
    }
}
