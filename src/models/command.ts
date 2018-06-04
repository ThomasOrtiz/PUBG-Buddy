export interface CommandHelp {
    name: string;
    description: string;
    usage: string;
    examples: string[];
}

export interface CommandConfiguration {
    enabled: boolean;
    guildOnly: boolean;
    aliases: string[];
    permLevel: number;
}

export abstract class Command {
    abstract run(bot: any, msg: any, params: string[], perms: number);
    conf: CommandConfiguration;
    help: CommandHelp;
}
