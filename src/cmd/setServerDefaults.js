const Discord = require('discord.js');
const cs = require('../services/common.service');
const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');

exports.run = async (bot, msg, params) => {
    let prefix = cs.getParamValue('prefix=', params, false);
    let season = cs.getParamValue('season=', params, false);
    let region = cs.getParamValue('region=', params, false);
    let mode = cs.getParamValue('mode=', params, false);
    let squadSize = cs.getParamValue('squadSize=', params, false);

    let checkingParametersMsg = await msg.channel.send('Checking for valid parameters ...');
    if(!(await checkParameters(msg, prefix, season, region, mode, squadSize))) {
        checkingParametersMsg.delete();
        return;
    }

    checkingParametersMsg.edit('Updating this server\'s defaults ...')
        .then(async (msg) => {
            sql.setServerDefaults(msg.guild.id, prefix, season, region, mode, +squadSize)
                .then(async () => {
                    let server = await sql.getServerDefaults(msg.guild.id);
                    let embed = new Discord.RichEmbed()
                        .setTitle('Server Defaults')
                        .setDescription('The defaults that a server has when running PUBG Bot commands.')
                        .setColor(0x00AE86)
                        .addField('Bot Prefix', server.default_bot_prefix, true)
                        .addBlankField(true)
                        .addBlankField(true)
                        .addBlankField(false)
                        .addField('Default Season', server.default_season, true)
                        .addField('Default Region', server.default_region, true)
                        .addField('Default Mode', server.default_mode, true)
                        .addField('Default Squad Size', server.default_squadSize, true);
                    msg.edit({embed});
                });
        });
};

async function checkParameters(msg, prefix, checkSeason, checkRegion, checkMode, checkSquadSize) {
    if(!prefix || !checkSeason || !checkRegion || !checkMode || !checkSquadSize) {
        cs.handleError(msg, 'Error:: Must specify all parameters', help);
        return;
    }
    let errMessage = '';

    let validPrefix = prefix.length > 0;
    let validSeason = await scrape.isValidSeason(checkSeason);
    let validRegion = await scrape.isValidRegion(checkRegion);
    let validMode = await scrape.isValidMode(checkMode);
    let validSquadSize = await scrape.isValidSquadSize(checkSquadSize);

    if(!validSeason) {
        let seasons = await sql.getAllSeasons();
        let availableSeasons = '== Available Seasons ==\n';
        for(let i = 0; i < seasons.length; i++) {
            if(i < seasons.length-1) {
                availableSeasons += seasons[i].season + ', ';
            } else {
                availableSeasons += seasons[i].season; 
            }
        }
        errMessage += `\nError:: Invalid season parameter\n${availableSeasons}\n`;
    }
    if(!validRegion) {
        let regions = await sql.getAllRegions();
        let availableRegions = '== Available Regions ==\n';
        for(let i = 0; i < regions.length; i++) {
            if(i < regions.length-1) {
                availableRegions += regions[i].shortname + ', ';
            } else {
                availableRegions += regions[i].shortname;
            }
        }
        errMessage += `\nError:: Invalid region parameter\n${availableRegions}\n`;
    }
    if(!validMode) {
        let modes = await sql.getAllModes();
        let availableModes = '== Available Modes ==\n';
        for(let i = 0; i < modes.length; i++) {
            if(i < modes.length-1) {
                availableModes += modes[i].shortname + ', ';
            } else {
                availableModes += modes[i].shortname;
            }
        }
        errMessage += `\nError:: Invalid mode parameter\n${availableModes}\n`;
    }
    if(!validSquadSize) {
        let squadSizes = await sql.getAllSquadSizes();
        let availableSizes = '== Available Squad Sizes ==\n';
        for(let i = 0; i < squadSizes.length; i++) {
            if(i < squadSizes.length-1) {
                availableSizes += squadSizes[i].size + ', ';
            } else {
                availableSizes += squadSizes[i].size;
            }
        }
        errMessage += `\nError:: Invalid squad size parameter\n${availableSizes}\n`;
    }

    if(!validPrefix || !validSeason || !validRegion || !validMode || !validSquadSize) {
        cs.handleError(msg, errMessage, help);
        return false;
    }
    return true;
}

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 4
};

let help = exports.help = {
    name: 'setServerDefaults',
    description: 'Set the server defaults for pubg commands. Only usable by users with administrator permissions.',
    usage: '<prefix>setServerDefaults <prefix=[prefix]> <season=(2018-01 | 2018-02 | 2018-03)> <region=(na | as | kr/jp | kakao | sa | eu | oc | sea)> <squadSize=(1 | 2 | 4)> <mode=(fpp | tpp)>',
    examples: [
        '!pubg-setServerDefaults prefix=!pubg- season=2018-03 region=na squadSize=4 mode=tpp',
    ]
};