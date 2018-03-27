/**
 * Add the new season,
 * Change default season on adding server to new season,
 * Update all servers to use the newest season.
 */

BEGIN;
    INSERT INTO seasons (name, season)
    VALUES ('Season 4', '2018-04')
    ON CONFLICT (season) do nothing;

    ALTER TABLE servers ALTER COLUMN default_season SET DEFAULT '2018-04';

    UPDATE servers set default_season='2018-04';

COMMIT;
