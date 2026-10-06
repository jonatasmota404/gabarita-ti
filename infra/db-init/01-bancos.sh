#!/bin/sh
# Roda só na primeira inicialização do volume (docker-entrypoint-initdb.d).
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
CREATE DATABASE gabarita_test;
CREATE DATABASE ingest_dev;
SQL
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ingest_dev -f /ingest-fixture/contrato-v1.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ingest_dev -f /ingest-fixture/seed-exemplo.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ingest_dev \
  -v leitor=app_leitor -v senha="$APP_LEITOR_SENHA" -v banco=ingest_dev \
  -f /ingest-fixture/role-leitor.sql
