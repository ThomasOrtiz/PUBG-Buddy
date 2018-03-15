exports.run = (bot, msg, params) => {
    let shrugString = '';
    let amount = 1;
    if(params[0] && !isNaN(params[0])) {
        amount = +params[0];
        if(amount > 15) amount = 15;
    }

    for(let i = 0; i < amount; i++){
        let backslash = '\\';
        shrugString += '¯' + backslash.repeat(3) + '_ツ' + backslash + '_/¯\t';
    }

    msg.channel.send(shrugString);
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
    usage: '<prefix>shrug <amount of shrugs <= 15>',
    examples: [
        '!pubg-shrug',
        '!pubg-shrug 5'
    ]
};