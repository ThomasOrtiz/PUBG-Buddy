const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();

    msg.channel.send('Webscraping for ' + username + '\' PUBG Id ... give me a second')
        .then(async (message) => {
            let id = await scrape.getCharacterID(username);
        
            if (id && id !== '') {
                await sql.registerUserToServer(id, msg.channel.id);
                message.edit('Added ' + username);
            } else {
                message.edit('Invalid username: ' + username);
            }
        });
    
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-addUser',
    description: 'Given a pubg username it will add a user to the list of players to track.',
    usage: 'pubg-addUser [pubg username]'
};