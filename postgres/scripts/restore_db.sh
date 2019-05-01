#!/bin/bash

POSTGRES_USER=pubg-buddy
POSTGRES_CONTAINER=pubg-discord-bot_postgres_1
ZIPPED_DUMP_FILE=db_backup.sql.gz
DUMP_FILE=db_backup.sql

echo 'Starting the restore'
cat $DUMP_FILE | docker exec -i $POSTGRES_CONTAINER psql -U $POSTGRES_USER
echo 'Restore is finished'
