#!/usr/bin/env bash

# ==============================================================================
# Verichron - View Secret Value
# ==============================================================================
# Retrieves and displays the current value of a GCP Secret Manager secret.
# Shows the full value (unmasked) for debugging purposes.
#
# Usage:
#   ./scripts/view-secret.sh <secret-name>
#   ./scripts/view-secret.sh --list              # List all secret names
#   ./scripts/view-secret.sh --search <pattern>  # Search for secrets by name
# ==============================================================================

set -e

PROJECT="verichron-recover-staging"

if [[ -z "$1" ]]; then
  echo "=============================================="
  echo "View Secret Value"
  echo "=============================================="
  echo ""
  echo "Usage:"
  echo "  ./scripts/view-secret.sh <secret-name>"
  echo "  ./scripts/view-secret.sh --list"
  echo "  ./scripts/view-secret.sh --search <pattern>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/view-secret.sh JWT_ACCESS_TOKEN_EXPIRES_IN"
  echo "  ./scripts/view-secret.sh --search JWT"
  echo "  ./scripts/view-secret.sh --search DATABASE_URL"
  exit 1
fi

if [[ "$1" == "--list" ]]; then
  echo "=============================================="
  echo "All Secrets in $PROJECT"
  echo "=============================================="
  echo ""
  gcloud secrets list --project="$PROJECT" --format="table(name,createTime.date('%Y-%m-%d %H:%M'),replication.automatic)"
  exit 0
fi

if [[ "$1" == "--search" ]]; then
  PATTERN="$2"
  if [[ -z "$PATTERN" ]]; then
    echo "Error: Please provide a search pattern"
    echo "Usage: ./scripts/view-secret.sh --search <pattern>"
    exit 1
  fi

  echo "=============================================="
  echo "Secrets matching: $PATTERN"
  echo "=============================================="
  echo ""

  MATCHES=$(gcloud secrets list --project="$PROJECT" --format="value(name)" | grep -i "$PATTERN" || true)

  if [[ -z "$MATCHES" ]]; then
    echo "No secrets found matching '$PATTERN'"
    exit 0
  fi

  for SECRET in $MATCHES; do
    VALUE=$(gcloud secrets versions access latest --secret="$SECRET" --project="$PROJECT" 2>/dev/null || echo "[ERROR: Could not access]")
    echo "$SECRET"
    echo "  Value: $VALUE"
    echo ""
  done
  exit 0
fi

SECRET_NAME="$1"

echo "=============================================="
echo "Secret: $SECRET_NAME"
echo "=============================================="
echo ""

# Check if secret exists
if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT" >/dev/null 2>&1; then
  echo "Error: Secret '$SECRET_NAME' not found in project $PROJECT"
  echo ""
  echo "Did you mean one of these?"
  gcloud secrets list --project="$PROJECT" --format="value(name)" | grep -i "${SECRET_NAME:0:5}" | head -5 || echo "  (no similar secrets found)"
  exit 1
fi

# Get secret metadata
echo "Metadata:"
gcloud secrets describe "$SECRET_NAME" --project="$PROJECT" --format="yaml(createTime,replication)" 2>/dev/null | sed 's/^/  /'
echo ""

# Get version info
echo "Versions:"
gcloud secrets versions list "$SECRET_NAME" --project="$PROJECT" --format="table(name.basename(),state,createTime.date('%Y-%m-%d %H:%M'))" --limit=5
echo ""

# Get current value
echo "Current Value (latest):"
VALUE=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" 2>/dev/null)

if [[ -z "$VALUE" ]]; then
  echo "  (empty)"
else
  echo "  $VALUE"

  # Check for whitespace issues
  if [[ "$VALUE" =~ [[:space:]]$ ]]; then
    echo ""
    echo "  WARNING: Value has TRAILING WHITESPACE"
    echo "  This may cause runtime errors!"
    echo "  Run: ./scripts/fix-secret-whitespace.sh $SECRET_NAME"
  fi

  if [[ "$VALUE" =~ ^[[:space:]] ]]; then
    echo ""
    echo "  WARNING: Value has LEADING WHITESPACE"
    echo "  Run: ./scripts/fix-secret-whitespace.sh $SECRET_NAME"
  fi
fi

echo ""
