const cs = require('../services/common.service');
const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        cs.handleError(msg, 'Error:: Must specify at least one username', help);
        return;
    }

    for(let i=0; i < params.length; i++) {
        let username = params[i].toLowerCase();
        let serverDefaults = await sql.getServerDefaults(msg.guild.id);
        let region = cs.getParamValue('region=', params, serverDefaults.default_region);

        msg.channel.send(`Removing ${username} from server registry`)
            .then(async (message) => {
                let pubgId = await scrape.getCharacterID(username, region);
                if(!pubgId) {
                    message.edit(`Could not find ${username} on the ${region} region. Double check the username and region.`);
                    return;
                }

                let unregistered = await sql.unRegisterUserToServer(pubgId, message.guild.id);
                if(unregistered) {
                    message.edit(`Removed ${username} from server registry`);
                } else {
                    message.edit(`${username} does not exist on server registery`);
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
    name: 'removeUser',
    description: 'Removes a user from the server\'s registery.',
    usage: '<prefix>removeUser <username ...> [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)]',
    examples: [
        '!pubg-removeUser john',
        '!pubg-removeUser john jane',
        '!pubg-removeUser john region=na'
    ]
};