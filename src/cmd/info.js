const { version } = require('discord.js');

exports.run = (bot, msg) => {
    msg.channel.send(`= PUBG Bot Information =
• Owner       :: Thomas Ortiz
• Github      :: https://github.com/Tdortiz/PUBG-Discord-Bot
• Mem Usage   :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Users       :: ${bot.users.size.toLocaleString()}
• Servers     :: ${bot.guilds.size.toLocaleString()}
• Channels    :: ${bot.channels.size.toLocaleString()}
• Discord.js  :: v${version}
• Node        :: ${process.version}`, { code: 'asciidoc'});
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