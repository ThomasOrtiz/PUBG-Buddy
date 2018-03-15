const cs = require('../services/common.service');
const sqlService = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    let default_bot_prefix = cs.getEnviornmentVariable('prefix');
    let prefix = default_bot_prefix;
    if(msg.guild) {
        let server_defaults = await sqlService.getServerDefaults(msg.guild.id);
        prefix = server_defaults.default_bot_prefix;
    }

    let prefix_explanation =    '= Prefix Explanation = \n\n' +
                                'This bot\'s prefix is configurable if on a server through the `setServerDefaults` command.\n\n' +
                                'Default Bot Prefix:   \t"' + default_bot_prefix + '"\n' +
                                'Current Server Prefix:\t "' + prefix + '"';
    
    if (!params[0]) {
        let commandList = bot.commands.map(c=>`${c.help.name}:: ${c.help.description}`).join('\n');
        let parameterExplanation =  '= Parameter Explanation =\n\n' + 
                                    'required:: <parameter> \n' +
                                    'optional:: [parameter]\n' +
                                    'select one:: (option1 | option2 | option3)\n' +
                                    'optional select one:: [(option1 | option2 | option3)]\n\n';
        let parameterExample =  '= Parameter Example =\n\n' +
                                'pubg-rank <pubg username> [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [mode=(fpp | tpp)]\n\n' + 
                                '"pubg-rank" requires a <pubg username> parameter and takes the following optional parameters: "season=", "region=" and "mode=". Each of these optional parameters ' +
                                'requires that one of the items within the "()" to be selected. Some valid call of this command is:\n\n' + 
                                '\tpubg-rank johndoe\n' + 
                                '\tpubg-rank johndoe season=2018-03 region=as mode=tpp\n' + 
                                '\tpubg-rank janedoe season=2018-03 mode=tpp\n' + 
                                '\tpubg-rank johndoe region=eu mode=fpp\n' +
                                '\t...';
        msg.channel.send(`${prefix_explanation}\n\n= Command List =\n\n[Use "pubg-help <commandname>" for details]\n\n${commandList}\n\n${parameterExplanation}${parameterExample}`, { code: 'asciidoc'});
    } else {
        let command = params[0];
        if (bot.commands.has(command)) {
            command = bot.commands.get(command);
            msg.channel.send(`${prefix_explanation}\n\n= ${command.help.name} = \n${command.help.description}\nusage:: ${command.help.usage}`, { code: 'asciidoc'});
        }
    }
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [''],
    permLevel: 0
};

exports.help = {
    name: 'help',
    description: 'Returns page details.',
    usage: '[prefix]help [command]'
};