#!/bin/bash
# Run database migrations for all services against Cloud SQL staging instance
# Usage: ./scripts/run-migrations-staging.sh
# Prerequisites: Cloud SQL Proxy installed and DATABASE_URL configured

# set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"
CLOUD_SQL_INSTANCE="${PROJECT}:${REGION}:verichron-recover"

# Services with TypeORM migrations
SERVICES_WITH_MIGRATIONS=(
  "api-users"
  "api-organizations"
  "api-debts"
  "api-debtors"
  "api-transactions"
  "api-communications"
  "api-collectors"
  "api-voice"
  "api-workflows"
  "api-audits"
)

echo "================================"
echo "Running Database Migrations"
echo "================================"
echo "Target: Cloud SQL Staging"
echo "Instance: $CLOUD_SQL_INSTANCE"
echo "================================"

# Check if Cloud SQL Proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo "⚠️  Cloud SQL Proxy not found. Installing..."
  echo ""
  echo "Downloading Cloud SQL Proxy v2.8.0..."
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
  sudo mv cloud-sql-proxy /usr/local/bin/
  echo "✅ Cloud SQL Proxy installed"
fi

# Start Cloud SQL Proxy in background
echo ""
echo "========================================="
echo "Starting Cloud SQL Proxy..."
echo "========================================="
cloud-sql-proxy $CLOUD_SQL_INSTANCE &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "Waiting for proxy to start..."
sleep 5

# Check if proxy is running
if ! ps -p $PROXY_PID > /dev/null; then
  echo "❌ Cloud SQL Proxy failed to start"
  exit 1
fi
echo "✅ Cloud SQL Proxy running"

# Load environment variables from .env.stage
if [ ! -f ".env.stage" ]; then
  echo "❌ .env.stage file not found in current directory"
  echo "Please run this script from the project root: ."
  kill $PROXY_PID
  exit 1
fi

# Map service names to database names
declare -A SERVICE_DB_MAP=(
  ["api-users"]="users_db"
  ["api-organizations"]="organizations_db"
  ["api-debts"]="debts_db"
  ["api-debtors"]="debtors_db"
  ["api-transactions"]="transactions_db"
  ["api-communications"]="communications_db"
  ["api-collectors"]="collectors_db"
  ["api-voice"]="voice_db"
  ["api-workflows"]="workflows_db"
  ["api-automations"]="automations_db"
  ["api-analytics"]="analytics_db"
  ["api-audits"]="audits_db"
)

# Parse DATABASE_URL from .env.stage to get credentials
# We only care about User and Password here. DB Name will be dynamic.
DB_URL_RAW=$(grep "^DATABASE_URL=" .env.stage | cut -d '=' -f2-)
DB_USER=$(echo $DB_URL_RAW | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL_RAW | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo "User: $DB_USER"
echo "Connection: localhost:5432 (via Cloud SQL Proxy)"

# Run migrations for each service
echo ""
echo "========================================="
echo "Running Migrations"
echo "========================================="

SUCCESS_COUNT=0
FAILED_SERVICES=()

for SERVICE in "${SERVICES_WITH_MIGRATIONS[@]}"; do
  echo ""
  echo "----------------------------------------"
  echo "📦 $SERVICE"
  echo "----------------------------------------"

  # Determine correct database name
  TARGET_DB="${SERVICE_DB_MAP[$SERVICE]}"
  
  if [ -z "$TARGET_DB" ]; then
    echo "⚠️  No database mapping found for $SERVICE, skipping..."
    continue
  fi

  echo "Target Database: $TARGET_DB"

  # Export the service-specific connection string
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${TARGET_DB}"

  cd "apps/$SERVICE"

  if [ ! -f "package.json" ]; then
    echo "⚠️  package.json not found, skipping..."
    cd ../..
    continue
  fi

  # Check if migration:run script exists
  if ! grep -q "migration:run" package.json; then
    echo "⚠️  No migration:run script found, skipping..."
    cd ../..
    continue
  fi

  # Run migrations
  echo "Running migrations..."
  if pnpm run migration:run; then
    echo "✅ Migrations completed successfully"
    ((SUCCESS_COUNT++))
  else
    echo "❌ Migration failed"
    FAILED_SERVICES+=($SERVICE)
  fi

  cd ../..
done

# Stop Cloud SQL Proxy
echo ""
echo "========================================="
echo "Stopping Cloud SQL Proxy..."
echo "========================================="
kill $PROXY_PID
echo "✅ Proxy stopped"

# Summary
echo ""
echo "========================================="
echo "Migration Summary"
echo "========================================="
echo "Total services: ${#SERVICES_WITH_MIGRATIONS[@]}"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: ${#FAILED_SERVICES[@]}"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  echo ""
  echo "❌ Failed services:"
  for SERVICE in "${FAILED_SERVICES[@]}"; do
    echo "  - $SERVICE"
  done
  exit 1
else
  echo ""
  echo "✅ All migrations completed successfully!"
fi

echo ""
echo "Next steps:"
echo "  1. Verify migrations in Cloud SQL Console"
echo "  2. Test API endpoints: ./scripts/verify-deployment-staging.sh"
echo "  3. Update service URLs if needed: ./scripts/update-service-urls-staging.sh"
