exports.run = (bot, msg) => {
    msg.channel.send('= PUBG Bot Information =\n\nOwner:: Thomas Ortiz\nGithub:: https://github.com/Tdortiz/PUBG-Discord-Bot\nFramework:: discord.js 11.3.0\n', { code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'info',
    description: 'Returns details about the bot',
    usage: '<prefix>info',
    examples: [
        '!pubg-info'
    ]
};