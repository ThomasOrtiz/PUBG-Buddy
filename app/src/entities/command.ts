import { DiscordClientWrapper } from './DiscordClientWrapper';
import * as Discord from 'discord.js';

export interface CommandHelp {
    name: string;
    description: string;
    usage: string;
    examples: string[];
}

export interface CommandConfiguration {
    group: string;
    enabled: boolean;
    guildOnly: boolean;
    aliases: string[];
    permLevel: number;
}

export abstract class Command {

    public conf: CommandConfiguration;
    public help: CommandHelp;

    abstract run(bot: DiscordClientWrapper, msg: Discord.Message, params: string[], perms: number): void;
}
