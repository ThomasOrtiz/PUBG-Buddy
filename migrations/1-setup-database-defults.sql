/**
    Setup players, servers, server_registery, user_registery tables
*/

BEGIN;
    CREATE TABLE IF NOT EXISTS players
        (id SERIAL PRIMARY KEY,
        pubg_id TEXT UNIQUE,
        username TEXT,
        platform TEXT);

    CREATE TABLE IF NOT EXISTS servers
        (id SERIAL PRIMARY KEY,
        server_id TEXT UNIQUE,
        default_bot_prefix TEXT DEFAULT '!pubg-',
        default_region TEXT DEFAULT 'PC_NA',
        default_mode TEXT DEFAULT 'SQUAD_FPP');

    CREATE TABLE IF NOT EXISTS server_registery
        (id SERIAL PRIMARY KEY,
        fk_players_id integer REFERENCES players (id) ON DELETE CASCADE,
        fk_servers_id integer REFERENCES servers (id) ON DELETE CASCADE);

    CREATE TABLE IF NOT EXISTS user_registery
        (id SERIAL PRIMARY KEY,
        discord_id TEXT UNIQUE,
        fk_players_id integer REFERENCES players (id) ON DELETE CASCADE);
COMMIT;
