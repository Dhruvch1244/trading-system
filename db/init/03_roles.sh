#!/bin/bash
# Sourced by the postgres docker-entrypoint during initdb, after 00-02 .sql run.
# Uses env vars (POSTGRES_DB, POSTGRES_USER, POSTGRES_ANALYTICS_READER_PASSWORD) already
# present in this container, so the analytics_reader password stays out of the SQL files.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'analytics_reader') THEN
        CREATE ROLE analytics_reader LOGIN PASSWORD '${POSTGRES_ANALYTICS_READER_PASSWORD}';
     END IF;
  END
  \$\$;

  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO analytics_reader;
  GRANT USAGE ON SCHEMA public TO analytics_reader;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;
EOSQL
