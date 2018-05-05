const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        cs.handleError(msg, 'Error:: Must specify at least one username', help);
        return;
    }

    for(let i=0; i < params.length; i++) {
        let username = params[i].toLowerCase();
        let serverDefaults = await sql.getServerDefaults(msg.guild.id);
        let region = cs.getParamValue('region=', params, serverDefaults.default_region);

        msg.channel.send(`Checking for ${username}'s PUBG Id ... give me a second`)
            .then(async (message) => {
                let pubgId = await scrape.getCharacterID(username, region);
            
                if (pubgId && pubgId !== '') {
                    let registered = await sql.registerUserToServer(pubgId, message.guild.id);
                    if(registered) {
                        message.edit(`Added ${username}`);
                    } else {
                        message.edit(`Could not add ${username}`);
                    }
                } else {
                    message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
                }
            });
    }
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

let help = exports.help = {
    name: 'addUser',
    description: 'Adds user(s) to the server\'s registery.',
    usage: '<prefix>addUser <username ...> [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)]',
    examples: [
        '!pubg-addUser john',
        '!pubg-addUser john jane',
        '!pubg-addUser john region=eu'
    ]
};