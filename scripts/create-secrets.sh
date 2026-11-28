#!/usr/bin/env bash

# ==============================================================================
# Verichron - Create/Update GCP Secrets from .env.stage
# ==============================================================================
# Reads .env.stage and creates or updates secrets in GCP Secret Manager.
# Automatically trims whitespace to prevent runtime errors.
#
# Usage:
#   ./scripts/create-secrets.sh              # Create/update all secrets
#   ./scripts/create-secrets.sh --dry-run    # Preview without making changes
# ==============================================================================

set -e  # Exit on error

ENV_FILE=".env.stage"
PROJECT_ID="verichron-recover-staging"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "DRY RUN MODE - No changes will be made"
  echo ""
fi

echo "=============================================="
echo "Sync Secrets to GCP Secret Manager"
echo "=============================================="
echo "Source: $ENV_FILE"
echo "Target: $PROJECT_ID"
echo ""

# Counters
CREATED=0
SKIPPED=0
FAILED=0
TRIMMED=0

while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines
  if [ -z "$line" ]; then
    continue
  fi

  # Skip comments (using grep instead of regex)
  if echo "$line" | grep -q '^[[:space:]]*#'; then
    continue
  fi

  # Extract key=value - simple approach
  # Check if line contains = and starts with uppercase letter
  if echo "$line" | grep -q '^[A-Z_][A-Z0-9_]*='; then
    KEY=$(echo "$line" | cut -d '=' -f 1)
    VALUE=$(echo "$line" | cut -d '=' -f 2-)

    # Remove inline comments (but preserve # in URLs)
    VALUE=$(echo "$VALUE" | sed 's/ #.*$//')

    # AUTO-TRIM: Remove leading and trailing whitespace to prevent runtime errors
    # This fixes issues like "1h " causing JWT errors
    ORIGINAL_VALUE="$VALUE"
    VALUE=$(echo -n "$VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    if [[ "$ORIGINAL_VALUE" != "$VALUE" ]]; then
      echo "   (auto-trimmed whitespace from $KEY)"
      TRIMMED=$((TRIMMED + 1))
    fi

    # Skip if value contains template variables like ${...}
    if echo "$VALUE" | grep -q '\${'; then
      echo "⏭️  Skipping $KEY (contains template variable)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Skip certain variables that shouldn't be in Secret Manager
    case "$KEY" in
      MIN_INSTANCES|MAX_INSTANCES|NODE_ENV|LOG_LEVEL|METRICS_PORT)
        echo "⏭️  Skipping $KEY (deployment config, not secret)"
        SKIPPED=$((SKIPPED + 1))
        continue
        ;;
    esac

    # Create the secret
    echo "Processing: $KEY"

    if [[ "$DRY_RUN" == true ]]; then
      echo "   Would set value: ${VALUE:0:20}..."
      CREATED=$((CREATED + 1))
      echo ""
      continue
    fi

    # Check if secret already exists
    if gcloud secrets describe "$KEY" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo "   Secret exists, adding new version..."
      if echo -n "$VALUE" | gcloud secrets versions add "$KEY" \
        --project="$PROJECT_ID" \
        --data-file=- >/dev/null 2>&1; then
        echo "   Updated"
        CREATED=$((CREATED + 1))
      else
        echo "   FAILED"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   Creating new secret..."
      if echo -n "$VALUE" | gcloud secrets create "$KEY" \
        --project="$PROJECT_ID" \
        --replication-policy="automatic" \
        --data-file=- >/dev/null 2>&1; then
        echo "   Created"
        CREATED=$((CREATED + 1))
      else
        echo "   FAILED"
        FAILED=$((FAILED + 1))
      fi
    fi
    echo ""
  fi
done < "$ENV_FILE"

echo "=============================================="
echo "Summary"
echo "=============================================="
echo "Created/Updated: $CREATED secrets"
echo "Skipped:         $SKIPPED secrets"
echo "Failed:          $FAILED secrets"
echo "Auto-trimmed:    $TRIMMED values (whitespace removed)"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "This was a DRY RUN. Run without --dry-run to apply changes."
fi

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
