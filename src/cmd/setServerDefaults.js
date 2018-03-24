const Discord = require('discord.js');
const cs = require('../services/common.service');
const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');
const SeasonEnum = require('../enums/season.enum');

exports.run = async (bot, msg, params) => {
    let prefix = cs.getParamValue('prefix=', params, false);
    let season = cs.getParamValue('season=', params, false);
    let region = cs.getParamValue('region=', params, false);
    let mode = cs.getParamValue('mode=', params, false);
    let squadSize = +cs.getParamValue('squadSize=', params, false);

    if(!prefix || !season || !region || !mode || !squadSize) {
        handleError(msg, 'Must specify all parameters');
        return;
    }

    let seasonId = SeasonEnum.get(season) || season;
    if(!(await checkParameters(msg, prefix, seasonId, region, mode, squadSize))) {
        return;
    }

    msg.channel.send('Updating this server\'s pubg defaults ...')
        .then(async (msg) => {
            sql.setServerDefaults(msg.guild.id, prefix, season, region, mode, squadSize)
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

function handleError(msg, errMessage) {
    msg.channel.send(`Error:: ${errMessage}\n\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`, { code: 'asciidoc'});
}

async function checkParameters(msg, prefix, checkSeason, checkRegion, checkMode, checkSquadSize) {
    if(prefix.length === 0) {
        handleError(msg, 'Custom prefix can\'t be empty');
    }
    if(!(await scrape.isValidSeason(checkSeason))) {
        let seasons = await sql.getAllSeasons();
        let availableSeasons = '== Available Seasons ==\n';
        for(let i = 0; i < seasons.length; i++) {
            availableSeasons += seasons[i].season + '\n';
        }
        handleError(msg, `Invalid season parameter \n\n${availableSeasons}`, true);
        return false;
    }
    if(!(await scrape.isValidRegion(checkRegion))) {
        let regions = await sql.getAllRegions();
        let availableRegions = '== Available Regions ==\n';
        for(let i = 0; i < regions.length; i++) {
            availableRegions += regions[i].shortname + '\n';
        }
        handleError(msg, `Invalid region parameter \n\n${availableRegions}`, true);
        return false;
    }
    if(!(await scrape.isValidMode(checkMode))) {
        let modes = await sql.getAllModes();
        let availableModes = '== Available Modes ==\n';
        for(let i = 0; i < modes.length; i++) {
            availableModes += modes[i].shortname + '\n';
        }
        handleError(msg, `Invalid mode parameter \n\n${availableModes}`, true);
        return false;
    }
    if(!(await scrape.isValidSquadSize(checkSquadSize))) {
        let squadSizes = await sql.getAllSquadSizes();
        let availableSizes = '== Available Squad Sizes ==\n';
        for(let i = 0; i < squadSizes.length; i++) {
            availableSizes += squadSizes[i].size + '\n';
        }
        handleError(msg, `Invalid squadSize parameter \n\n${availableSizes}`, true);
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