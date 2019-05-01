FROM postgres:11

ENV POSTGRES_DB pubg-buddy

VOLUME /pgdata

COPY initial_dump.sql /docker-entrypoint-initdb.d/
