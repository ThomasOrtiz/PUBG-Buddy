#!/bin/bash
find ./migrations -maxdepth 1 -mindepth 1 | while read f; do
    printf 'Migrating: %s\n' $f
    heroku pg:psql --app pubg-stat-discord-bot-dev < $f
    printf '\n'
done
printf 'Finished migrating\n'
