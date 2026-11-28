#!/bin/bash
set -e

# This function creates a database for a service if it doesn't already exist.
create_database() {
  local database=$1
  echo "  Creating database '$database'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $database'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
EOSQL
}

# List of databases to create, one for each service.
databases=(
  users_db
  debts_db
  organizations_db
  payments_db
  debtors_db
  communications_db
  transactions_db
  collectors_db
  voice_db
  workflows_db
  analytics_db
  audits_db
)

echo "Initializing databases for Verichron microservices..."

for db in "${databases[@]}"; do
  create_database "$db"
done

echo "All databases created successfully!"
