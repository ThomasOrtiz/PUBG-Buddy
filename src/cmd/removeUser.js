const cs = require('../services/common.service');
const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        cs.handleError(msg, 'Error:: Must specify a username', help);
        return;
    }
    let username = params[0].toLowerCase();

    msg.channel.send('Removing ' + username + ' from server registry')
        .then(async (message) => {
            let pubgId = await scrape.getCharacterID(username);
            if(!pubgId) {
                message.edit('Invalid username: ' + username);
                return;
            }

            let unregistered = await sql.unRegisterUserToServer(pubgId, message.guild.id);
            if(unregistered) {
                message.edit('Removed ' + username + ' from server registry');
            } else {
                message.edit(username + ' did not exist on server registery');
            }
            
        });
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
    usage: '<prefix>removeUser <username>',
    examples: [
        '!pubg-removeUser john',
    ]
};