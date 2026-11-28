#!/usr/bin/env bash

# ==============================================================================
# Verichron - Compare Local Secrets with GCP
# ==============================================================================
# Compares values in .env.stage with corresponding secrets in GCP Secret Manager.
# Identifies mismatches that could cause deployment inconsistencies.
#
# Usage:
#   ./scripts/compare-secrets.sh              # Compare all
#   ./scripts/compare-secrets.sh --summary    # Only show mismatches
# ==============================================================================

set -e

PROJECT="verichron-recover-staging"
ENV_FILE=".env.stage"
SUMMARY_ONLY=false

if [[ "$1" == "--summary" ]]; then
  SUMMARY_ONLY=true
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  echo "Please run this script from the project root: ."
  exit 1
fi

echo "=============================================="
echo "Compare Local vs GCP Secrets"
echo "=============================================="
echo "Local:  $ENV_FILE"
echo "Remote: GCP Secret Manager ($PROJECT)"
echo ""

# Counters
TOTAL=0
MATCH=0
MISMATCH=0
LOCAL_ONLY=0
GCP_ONLY=0

# Arrays for tracking
declare -a MISMATCH_SECRETS
declare -a LOCAL_ONLY_SECRETS

echo "Comparing secrets..."
echo ""

# Read .env.stage line by line
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip empty lines and comments
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  # Only process lines that look like KEY=VALUE
  if [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]]; then
    KEY=$(echo "$line" | cut -d '=' -f 1)
    LOCAL_VALUE=$(echo "$line" | cut -d '=' -f 2-)

    # Skip template variables
    if [[ "$LOCAL_VALUE" =~ \$\{ ]]; then
      continue
    fi

    # Skip deployment config vars
    case "$KEY" in
      MIN_INSTANCES|MAX_INSTANCES|NODE_ENV|LOG_LEVEL|METRICS_PORT)
        continue
        ;;
    esac

    TOTAL=$((TOTAL + 1))

    # Get GCP value
    GCP_VALUE=$(gcloud secrets versions access latest --secret="$KEY" --project="$PROJECT" 2>/dev/null || echo "__NOT_FOUND__")

    if [[ "$GCP_VALUE" == "__NOT_FOUND__" ]]; then
      LOCAL_ONLY=$((LOCAL_ONLY + 1))
      LOCAL_ONLY_SECRETS+=("$KEY")
      if [[ "$SUMMARY_ONLY" == false ]]; then
        echo "  [LOCAL ONLY] $KEY"
        echo "    Local:  ${LOCAL_VALUE:0:30}..."
        echo "    GCP:    (not found)"
        echo ""
      fi
    elif [[ "$LOCAL_VALUE" == "$GCP_VALUE" ]]; then
      MATCH=$((MATCH + 1))
      if [[ "$SUMMARY_ONLY" == false ]]; then
        echo "  [MATCH] $KEY"
      fi
    else
      MISMATCH=$((MISMATCH + 1))
      MISMATCH_SECRETS+=("$KEY")

      # Determine the type of mismatch
      LOCAL_TRIMMED=$(echo -n "$LOCAL_VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      GCP_TRIMMED=$(echo -n "$GCP_VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

      if [[ "$LOCAL_TRIMMED" == "$GCP_TRIMMED" ]]; then
        MISMATCH_TYPE="WHITESPACE DIFFERENCE"
      else
        MISMATCH_TYPE="VALUE DIFFERENCE"
      fi

      echo "  [MISMATCH - $MISMATCH_TYPE] $KEY"
      echo "    Local:  '$LOCAL_VALUE'"
      echo "    GCP:    '$GCP_VALUE'"

      # Show character comparison if whitespace issue
      if [[ "$MISMATCH_TYPE" == "WHITESPACE DIFFERENCE" ]]; then
        echo "    Note:   Values match after trimming whitespace"
      fi
      echo ""
    fi
  fi
done < "$ENV_FILE"

echo ""
echo "=============================================="
echo "Summary"
echo "=============================================="
echo "Total compared: $TOTAL"
echo "Matching:       $MATCH"
echo "Mismatched:     $MISMATCH"
echo "Local only:     $LOCAL_ONLY"
echo ""

if [[ $MISMATCH -gt 0 ]]; then
  echo "MISMATCHED SECRETS:"
  for SECRET in "${MISMATCH_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
  echo "To sync local values to GCP:"
  echo "  ./scripts/create-secrets.sh"
  echo ""
fi

if [[ $LOCAL_ONLY -gt 0 ]]; then
  echo "SECRETS ONLY IN LOCAL (not in GCP):"
  for SECRET in "${LOCAL_ONLY_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
  echo "To create these in GCP:"
  echo "  ./scripts/create-secrets.sh"
  echo ""
fi

# Check for secrets in GCP not in local
echo "Checking for GCP secrets not in local file..."
GCP_SECRETS=$(gcloud secrets list --project="$PROJECT" --format="value(name)" 2>/dev/null)
GCP_ONLY_COUNT=0
declare -a GCP_ONLY_SECRETS

for GCP_SECRET in $GCP_SECRETS; do
  if ! grep -q "^${GCP_SECRET}=" "$ENV_FILE" 2>/dev/null; then
    GCP_ONLY_COUNT=$((GCP_ONLY_COUNT + 1))
    GCP_ONLY_SECRETS+=("$GCP_SECRET")
  fi
done

if [[ $GCP_ONLY_COUNT -gt 0 ]]; then
  echo ""
  echo "SECRETS ONLY IN GCP (not in local $ENV_FILE):"
  for SECRET in "${GCP_ONLY_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
  echo "These may be:"
  echo "  - Orphaned secrets (can be deleted)"
  echo "  - Secrets managed outside of .env.stage"
  echo "  - Newly required secrets not yet added to local file"
fi

if [[ $MISMATCH -gt 0 || $LOCAL_ONLY -gt 0 ]]; then
  exit 1
fi

echo ""
echo "All secrets are in sync!"
exit 0
