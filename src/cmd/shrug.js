exports.run = (bot, msg) => {
    msg.channel.sendMessage('¯\\\\_ツ_/¯');
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'shrug',
    description: 'Get your shrug on',
    usage: 'shrug'
};