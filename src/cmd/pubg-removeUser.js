const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();
    msg.channel.send('Removing ' + username + ' from server registry')
        .then(async (message) => {
            let pubgId = await scrape.getCharacterID(username);

            let unregistered = await sql.unRegisterUserToServer(pubgId, message.guild.id);
            if(unregistered) {
                message.edit('Removed ' + username + ' from server registry');
            } else {
                message.edit(username + ' did not exist on server registery');
            }
            
        });
}

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-removeUser',
    description: 'Removes a user from the server\'s registery.',
    usage: 'pubg-removeUser [username]'
};