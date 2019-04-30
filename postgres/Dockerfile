# Specifies the base image we're extending
FROM postgres

ENV POSTGRES_DB pubg-buddy

COPY initial_dump.sql /docker-entrypoint-initdb.d/
