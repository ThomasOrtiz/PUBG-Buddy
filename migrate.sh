#!/bin/bash
# This isn't being used for now but I would like to use heroko directly for migrations instead of node. 

curl -s https://s3.amazonaws.com/assets.heroku.com/heroku-client/heroku-client.tgz | tar xz
PATH="/app/heroku-client/bin:$PATH"

find ./migrations -maxdepth 1 -mindepth 1 | while read f; do
    printf 'Migrating: %s\n' $f
    heroku pg:psql --app pubg-stat-discord-bot-dev < $f
    printf '\n'
done
printf 'Finished migrating\n'
