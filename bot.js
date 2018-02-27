const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const scrape = require('./phantom-server');
const cache = require('./caching');


// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

const bot = new Discord.Client();
bot.login(auth.token);


bot.on('ready', () => {
    logger.info('Connected');
});

bot.on('message', async function(message) {
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];

        await processCommand(message, cmd, args);
    }
});


async function processCommand(message, cmd, args) {
    console.log("ARGS = " + args);
    message.channel.startTyping();
    let username = '';
    let id = 0;
    let data = {};
    let userToIdMapping = await cache.getCaching();
    let embed = null;

    switch(cmd) {
        case 'pubg-help':
            let commands = ['pubg-rank', 'pubg-users', 'pubg-addUser', 'pubg-removeUser', 'pubg-top'];


            embed = new Discord.RichEmbed()
                .setColor(0x00AE86)
                .addField("Commands", commands, true)
                .addBlankField(true)

            message.channel.send({embed});
            break;
        case 'pubg-rank': 
            username = args[1].toLowerCase();
            id = await scrape.getCharacterID(userToIdMapping, username);
            data = await scrape.getPUBGCharacterData(id, username);
            //message.channel.send(JSON.stringify(data, null, 2));
            // https://pubg.op.gg/api/users/59fe35915121b600010160cb/ranked-stats?season=2018-02&server=na&queue_size=1&mode=fpp
            embed = new Discord.RichEmbed()
                .setTitle("PUBG Stats")
                .setColor(0x00AE86)
                .setDescription(username)
                .setFooter("Data retrieved from https://pubg.op.gg/")
                .setTimestamp()
                // .addField("Type", 'FPP Solo', true)
                // .addField("Rank", 'N/A', true)
                // .addField("Top %", 'N/A', true)
                // .addBlankField()
                // .addField("Type", 'FPP Duo', true)
                // .addField("Rank", 'N/A', true)
                // .addField("Top %", 'N/A', true)
                //.addBlankField()
                .addField("Type", 'FPP Squad', true)
                .addField("Rank", data.ranking, true)
                .addField("Top %", data.topPercent, true)
                .addBlankField(true)

                message.channel.send({embed});
            break;
        case 'pubg-users':
            embed = new Discord.RichEmbed()
                .setTitle("People added")
                .setColor(0x00AE86);
            
            let players = "";
            for(key in userToIdMapping) {
                players += key + '\n';
            }

            embed
                .addField("Players", players, true)
                .addBlankField(true)

            message.channel.send({embed});
            break;
        case 'pubg-addUser':
            username = args[1].toLowerCase();

            id = await scrape.getCharacterID(userToIdMapping, username);
            if(id && id !== '') {
                userToIdMapping[username] = id;
                await cache.writeJSONToFile('caching.json', userToIdMapping);
                message.channel.send('Added ' + username);
            } else {
                message.channel.send('Invalid username');
            }
            break;
        case 'pubg-removeUser':
            username = args[1].toLowerCase();
            delete userToIdMapping[username];

            await cache.writeJSONToFile('caching.json', userToIdMapping);
            message.channel.send('Removed ' + username + ' mapping');
            break;
        case 'pubg-top':
            let amount = args[1];
            data = await scrape.aggregateData(userToIdMapping);
            let topPlayers = data.characters.slice(0, amount);

            // Make one every 5
            let amountProcessed = 0;
            while(amountProcessed < amount) {
                let fieldOffset = 10;
                embed = new Discord.RichEmbed()
                    .setTitle("PUBG Stats")
                    .setColor(0x00AE86)
                    .setDescription("Top " + amount + " local players in " + " Squad FPP")
                    .setFooter("Data retrieved from https://pubg.op.gg/")
                    .setTimestamp();

                let end = amountProcessed + fieldOffset;
                let names = "";
                let ranks = "";
                let topPercents = "";


                for(var i = amountProcessed; i < topPlayers.length && i < end; i++) {
                    var character = topPlayers[i];
                    names += character.nickname + '\n';
                    ranks += character.ranking + '\n';
                    topPercents += character.topPercent + '\n';
                }

                embed
                        .addField("Name", names, true)
                        .addField("Rank", ranks, true)
                        .addField("Top %", topPercents, true)
                amountProcessed += fieldOffset;
                message.channel.send({embed});
            }
            break;
        case 'showmeyourboobs':
            message.channel.send('( . ) ( . )');
            break;
        case 'shrug':
            message.channel.send('¯\\\\_ツ_/¯');
        default:
            message.channel.send(cmd + ' is not a valid command');
    }
    message.channel.stopTyping();
}