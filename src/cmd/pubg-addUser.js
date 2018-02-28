const scrape = require('../pubg.service');
const cache = require('../caching');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();
    let userToIdMapping = await cache.getUserToIdCache();

    msg.channel.send('Webscraping for ' + username + ' ... give me a second');
    let id = await scrape.getCharacterID(userToIdMapping, username);
    if (id && id !== '') {
        userToIdMapping[username] = id;
        await cache.writeJSONToFile('./output/caching.json', userToIdMapping);
        msg.channel.send('Added ' + username);
    } else {
        msg.channel.send('Invalid username');
    }
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