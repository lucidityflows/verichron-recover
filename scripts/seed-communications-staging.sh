#!/bin/bash
# Seed communication templates for api-communications in Cloud SQL Staging
# Usage: ./scripts/seed-communications-staging.sh

set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"
CLOUD_SQL_INSTANCE="${PROJECT}:${REGION}:verichron-recover"

echo "================================"
echo "Seeding Communication Templates"
echo "================================"
echo "Target: Cloud SQL Staging"
echo "Instance: $CLOUD_SQL_INSTANCE"
echo "================================"

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

# Configure for api-communications
TARGET_DB="communications_db"
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${TARGET_DB}"

echo "Target Database: $TARGET_DB"

# Run Seeding
echo ""
echo "Running seed script..."
cd apps/api-communications
if pnpm run seed:staging; then
  echo "Seeding completed successfully"
else
  echo "Seeding failed"
  cd ../..
  kill $PROXY_PID
  exit 1
fi

cd ../..

# Stop Proxy
echo ""
echo "Stopping Cloud SQL Proxy..."
kill $PROXY_PID
echo "Proxy stopped"

echo ""
echo "================================"
echo "Templates seeded successfully!"
echo "================================"
echo ""
echo "The USER_INVITATION template is now available."
echo "You can now retry the organization onboarding flow."
