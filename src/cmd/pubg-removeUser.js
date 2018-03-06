const sql = require('../sql.service');

exports.run = run;

async function run(bot, msg, params) {
    let username = params[0].toLowerCase();
    let player = await sql.getPlayer(username);
    msg.channel.send('Removing ' + username + ' from server registry')
        .then((message) => {
            sql.unRegisterUserToServer(player.pubgId, msg.channel.id);
            message.edit('Removed ' + username + ' from server registry');
        });
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