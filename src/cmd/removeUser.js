const sql = require('../services/sql.service');
const scrape = require('../services/pubg.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        handleError(msg, 'Must specify a username');
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

function handleError(msg, errMessage) {
    msg.channel.send(`Error:: ${errMessage}\n\n== usage == \n${help.usage}\n\n= Examples =\n\n${help.examples.map(e=>`${e}`).join('\n')}`, { code: 'asciidoc'});
}

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