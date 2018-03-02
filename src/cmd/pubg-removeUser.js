const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();
    let player = await sql.getPlayer(username);
    sql.unRegisterUserToServer(player.pubgId, msg.channel.id);
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