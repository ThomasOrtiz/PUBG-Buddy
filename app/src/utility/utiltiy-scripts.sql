-- Grab count of un-used players
select count(P.id) from players as P
    left join server_registery as SR on SR.fk_players_id = P.id
    left join user_registery as UR on UR.fk_players_id = P.id
where SR.fk_players_id IS NULL
and UR.fk_players_id IS NULL;

-- Deletes those un-used players
delete from players as PD where PD.id in (
    select P.id from players as P
        left join server_registery as SR on SR.fk_players_id = P.id
        left join user_registery as UR on UR.fk_players_id = P.id
    where SR.fk_players_id IS NULL
    and UR.fk_players_id IS NULL
);

-- Get row count for each table
select
    table_schema,
    table_name,
    (xpath('/row/count/text()', query_to_xml('select count(*) from '||format('%I.%I', table_schema, table_name), true, true, '')))[1]::text::int as row_count
from information_schema.tables
where table_schema = 'public';

-- Get aggregate count of tables
select
    sum((xpath('/row/count/text()', query_to_xml('select count(*) from '||format('%I.%I', table_schema, table_name), true, true, '')))[1]::text::int)
from
    information_schema.tables
where
    table_schema = 'public';
