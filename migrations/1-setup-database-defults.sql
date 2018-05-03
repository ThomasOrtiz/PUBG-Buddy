/** Setup players, servers, server_registery tables */
BEGIN;
    CREATE TABLE IF NOT EXISTS players (id SERIAL PRIMARY KEY, pubg_id TEXT, username TEXT);

    CREATE TABLE IF NOT EXISTS servers
        (id SERIAL PRIMARY KEY, server_id TEXT, default_bot_prefix TEXT DEFAULT '!pubg-', 
        default_season TEXT DEFAULT '2018-05',  default_region TEXT DEFAULT 'na', 
        default_mode TEXT DEFAULT 'fpp', default_squadSize TEXT DEFAULT '4');

    CREATE TABLE IF NOT EXISTS server_registery 
        (id SERIAL PRIMARY KEY, 
        fk_players_id integer REFERENCES players (id) ON DELETE CASCADE, 
        fk_servers_id integer REFERENCES servers (id) ON DELETE CASCADE);
COMMIT;

/** Setup seasons table */
BEGIN;

    CREATE TABLE IF NOT EXISTS seasons (id SERIAL PRIMARY KEY, name Text unique, season TEXT unique);

    INSERT INTO seasons (name, season)
    VALUES ('Season 1', '2018-01')
    ON CONFLICT (season) do nothing;

    INSERT INTO seasons (name, season)
    VALUES ('Season 2', '2018-02')
    ON CONFLICT (season) do nothing;

    INSERT INTO seasons (name, season)
    VALUES ('Season 3', '2018-03')
    ON CONFLICT (season) do nothing;

    INSERT INTO seasons (name, season)
    VALUES ('Season 4', '2018-04')
    ON CONFLICT (season) do nothing;

    INSERT INTO seasons (name, season)
    VALUES ('Season 5', '2018-05')
    ON CONFLICT (season) do nothing;
COMMIT;

/** Setup squad_sizes table */
BEGIN;
    CREATE TABLE IF NOT EXISTS squad_sizes (id SERIAL PRIMARY KEY, name TEXT unique, size integer unique);

    INSERT INTO squad_sizes (name, size)
    VALUES ('Solo', 1)
    ON CONFLICT (size) do nothing;

    INSERT INTO squad_sizes (name, size)
    VALUES ('Duo', 2)
    ON CONFLICT (size) do nothing;

    INSERT INTO squad_sizes (name, size)
    VALUES ('Squad', 4)
    ON CONFLICT (size) do nothing;
COMMIT;

/** Setup modes table */
BEGIN;
    CREATE TABLE IF NOT EXISTS modes (id SERIAL PRIMARY KEY, fullname TEXT unique, shortname text unique);

    INSERT INTO modes (fullname, shortname)
    VALUES ('First Person Perspective', 'fpp')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO modes (fullname, shortname)
    VALUES ('Third Person Perspective', 'tpp')
    ON CONFLICT (fullname) do nothing;
COMMIT;

/** Setup regions table */
BEGIN;
    CREATE TABLE IF NOT EXISTS regions (id SERIAL PRIMARY KEY, fullname TEXT unique, shortname text unique);

    INSERT INTO regions (fullname, shortname)
    VALUES ('North America', 'na')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Asia', 'as')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Korea', 'kr')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Japan', 'jp')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Korean', 'kakao')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('South America', 'sa')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Europe', 'eu')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('Oceania', 'oc')
    ON CONFLICT (fullname) do nothing;

    INSERT INTO regions (fullname, shortname)
    VALUES ('South-East Asia', 'sea')
    ON CONFLICT (fullname) do nothing;
COMMIT;