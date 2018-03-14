const scrape = require('../pubg.service');
const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
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
    
}

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-addUser',
    description: 'Adds a user to the server\'s registery.',
    usage: 'pubg-addUser [pubg username]'
};