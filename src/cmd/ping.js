exports.run = (bot, msg) => {
    msg.channel.send('Ping?')
        .then(message => {
            message.edit(`Pong! (took: ${message.createdTimestamp - msg.createdTimestamp}ms)`);
        });
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'ping',
    description: 'Check your ping to the bot',
    usage: '<prefix>ping',
    examples: [
        '!pubg-ping'
    ]
};