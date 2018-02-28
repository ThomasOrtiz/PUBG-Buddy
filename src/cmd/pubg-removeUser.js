const cache = require('../caching');

exports.run = run;

async function run(bot, msg, params) {
    let userToIdMapping = await cache.getUserToIdCache();

    let username = params[0].toLowerCase();
    delete userToIdMapping[username];

    await cache.writeJSONToFile('./output/caching.json', userToIdMapping);
    msg.channel.send('Removed ' + username + ' mapping');
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'pubg-removeUser',
    description: 'Removes a user from the list all tracked users.',
    usage: 'pubg-removeUser [username]'
};