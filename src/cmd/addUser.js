const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    if(!params[0]) {
        handleError(msg, 'Must specify a username');
        return;
    }
    let username = params[0].toLowerCase();

    msg.channel.send('Checking for ' + username + '\'s PUBG Id ... give me a second')
        .then(async (message) => {
            let pubgId = await scrape.getCharacterID(username);
        
            if (pubgId && pubgId !== '') {
                let registered = await sql.registerUserToServer(pubgId, message.guild.id);
                if(registered) {
                    message.edit('Added ' + username);
                } else {
                    message.edit('Could not add ' + username);
                }
                
            } else {
                message.edit('Invalid username: ' + username);
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
    name: 'addUser',
    description: 'Adds a user to the server\'s registery.',
    usage: '<prefix>addUser <pubg username>',
    examples: [
        '!pubg-addUser john'
    ]
};