#!/bin/bash
# Reset all staging database data (truncate tables, preserve schema)
# Usage: ./scripts/reset-staging-data.sh
#
# This script truncates all tables in staging databases while preserving
# the schema (migrations). After running, you can re-seed with fresh data.

set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"
CLOUD_SQL_INSTANCE="${PROJECT}:${REGION}:verichron-recover"

echo "========================================"
echo "STAGING DATA RESET"
echo "========================================"
echo "Target: Cloud SQL Staging"
echo "Instance: $CLOUD_SQL_INSTANCE"
echo ""
echo "WARNING: This will DELETE ALL DATA in staging databases."
echo "Schema and migrations will be preserved."
echo "========================================"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Check if Cloud SQL Proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo "Cloud SQL Proxy not found. Installing..."
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
  sudo mv cloud-sql-proxy /usr/local/bin/
  echo "Cloud SQL Proxy installed"
fi

# Start Cloud SQL Proxy in background
echo ""
echo "Starting Cloud SQL Proxy..."
cloud-sql-proxy $CLOUD_SQL_INSTANCE &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "Waiting for proxy to start..."
sleep 5

# Check if proxy is running
if ! ps -p $PROXY_PID > /dev/null; then
  echo "Cloud SQL Proxy failed to start"
  exit 1
fi
echo "Cloud SQL Proxy running"

# Load environment variables from .env.stage
if [ ! -f ".env.stage" ]; then
  echo ".env.stage file not found"
  kill $PROXY_PID
  exit 1
fi

# Parse credentials
DB_URL_RAW=$(grep "^DATABASE_URL=" .env.stage | cut -d '=' -f2-)
DB_USER=$(echo $DB_URL_RAW | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL_RAW | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Databases to reset
DATABASES=(
  "users_db"
  "organizations_db"
  "debts_db"
  "debtors_db"
  "transactions_db"
  "communications_db"
  "collectors_db"
  "voice_db"
  "workflows_db"
  "automations_db"
  "analytics_db"
  "audits_db"
)

echo ""
echo "========================================"
echo "Truncating tables in all databases..."
echo "========================================"

for DB in "${DATABASES[@]}"; do
  echo ""
  echo "----------------------------------------"
  echo "Resetting: $DB"
  echo "----------------------------------------"

  # Generate truncate commands for all tables except migrations
  TRUNCATE_SQL="
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';

    -- Truncate all tables except migrations table
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations')
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Truncated: %', r.tablename;
    END LOOP;

    -- Re-enable triggers
    SET session_replication_role = 'origin';
END \$\$;
"

  if PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB -c "$TRUNCATE_SQL" 2>/dev/null; then
    echo "Truncated all tables in $DB"
  else
    echo "Warning: Could not truncate $DB (may not exist or be empty)"
  fi
done

# Stop Proxy
echo ""
echo "Stopping Cloud SQL Proxy..."
kill $PROXY_PID 2>/dev/null || true
echo "Proxy stopped"

echo ""
echo "========================================"
echo "RESET COMPLETE"
echo "========================================"
echo ""
echo "All staging data has been cleared."
echo "Schema and migrations are preserved."
echo ""
echo "Next steps:"
echo "  1. Seed platform admin:  ./scripts/seed-users-staging.sh"
echo "  2. Seed templates:       ./scripts/seed-communications-staging.sh"
echo "  3. Seed workflows:       ./scripts/seed-workflows-staging.sh"
echo ""
