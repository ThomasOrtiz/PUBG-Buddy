#!/bin/bash

POSTGRES_USER=pubg-buddy
POSTGRES_CONTAINER=pubg-discord-bot_postgres_1

cd "$(dirname "$0")"

echo 'Backing up ...'
docker exec -t $POSTGRES_CONTAINER pg_dump -c -U $POSTGRES_USER | gzip > ../backups/dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql.gz
echo 'Finishing Backing up!'
