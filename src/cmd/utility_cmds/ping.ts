import { Command, CommandConfiguration, CommandHelp } from '../../models/command';


export class Ping extends Command {

    conf: CommandConfiguration = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0
    };

    help: CommandHelp = {
        name: 'ping',
        description: 'Check your ping to the bot',
        usage: '<prefix>ping',
        examples: [
            '!pubg-ping'
        ]
    };

    run(bot: any, msg: any, params: string[], perms: number) {
        msg.channel.send('Ping?')
            .then(message => {
                message.edit(`Pong! (took: ${message.createdTimestamp - msg.createdTimestamp}ms)`);
            });
    };

}
