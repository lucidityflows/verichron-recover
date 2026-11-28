#!/usr/bin/env bash

# ==============================================================================
# Verichron - Fix Secret Whitespace
# ==============================================================================
# Fixes trailing and leading whitespace in GCP Secret Manager secrets.
# Creates a new version of the secret with trimmed value.
#
# Usage:
#   ./scripts/fix-secret-whitespace.sh <secret-name>    # Fix one secret
#   ./scripts/fix-secret-whitespace.sh --all            # Fix all secrets
#   ./scripts/fix-secret-whitespace.sh --dry-run        # Preview without changes
#   ./scripts/fix-secret-whitespace.sh --all --dry-run  # Preview all
# ==============================================================================

set -e

PROJECT="verichron-recover-staging"
DRY_RUN=false
FIX_ALL=false
SECRET_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --all)
      FIX_ALL=true
      shift
      ;;
    *)
      SECRET_NAME="$1"
      shift
      ;;
  esac
done

# Counters
FIXED=0
SKIPPED=0
FAILED=0

fix_secret() {
  local NAME=$1

  # Get current value
  local VALUE
  VALUE=$(gcloud secrets versions access latest --secret="$NAME" --project="$PROJECT" 2>/dev/null || echo "")

  if [[ -z "$VALUE" ]]; then
    echo "  - $NAME: EMPTY (skipping)"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  # Trim leading and trailing whitespace
  # Using parameter expansion to avoid subshell issues
  local TRIMMED
  TRIMMED=$(echo -n "$VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  # Check if there's a difference
  if [[ "$VALUE" == "$TRIMMED" ]]; then
    echo "  - $NAME: OK (no whitespace)"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  # Show what will be changed
  local VALUE_LEN=${#VALUE}
  local TRIMMED_LEN=${#TRIMMED}
  local REMOVED=$((VALUE_LEN - TRIMMED_LEN))

  echo "  - $NAME:"
  echo "      Before: '$VALUE' (${VALUE_LEN} chars)"
  echo "      After:  '$TRIMMED' (${TRIMMED_LEN} chars)"
  echo "      Removing: $REMOVED whitespace character(s)"

  if [[ "$DRY_RUN" == true ]]; then
    echo "      [DRY RUN - no changes made]"
    return
  fi

  # Create new version with trimmed value
  if echo -n "$TRIMMED" | gcloud secrets versions add "$NAME" --project="$PROJECT" --data-file=- >/dev/null 2>&1; then
    echo "      FIXED!"
    FIXED=$((FIXED + 1))
  else
    echo "      FAILED to update!"
    FAILED=$((FAILED + 1))
  fi
}

echo "=============================================="
echo "Fix Secret Whitespace"
echo "=============================================="
echo "Project: $PROJECT"
if [[ "$DRY_RUN" == true ]]; then
  echo "Mode: DRY RUN (no changes will be made)"
fi
echo ""

if [[ "$FIX_ALL" == true ]]; then
  echo "Scanning all secrets..."
  echo ""

  SECRETS=$(gcloud secrets list --project="$PROJECT" --format="value(name)" 2>/dev/null)

  for SECRET in $SECRETS; do
    fix_secret "$SECRET"
  done
elif [[ -n "$SECRET_NAME" ]]; then
  echo "Fixing secret: $SECRET_NAME"
  echo ""
  fix_secret "$SECRET_NAME"
else
  echo "Error: Please specify a secret name or use --all"
  echo ""
  echo "Usage:"
  echo "  ./scripts/fix-secret-whitespace.sh <secret-name>"
  echo "  ./scripts/fix-secret-whitespace.sh --all"
  echo "  ./scripts/fix-secret-whitespace.sh --dry-run --all"
  exit 1
fi

echo ""
echo "=============================================="
echo "Summary"
echo "=============================================="
echo "Fixed:   $FIXED"
echo "Skipped: $SKIPPED"
echo "Failed:  $FAILED"

if [[ "$DRY_RUN" == true && $FIXED -gt 0 ]]; then
  echo ""
  echo "Run without --dry-run to apply changes."
fi

if [[ $FIXED -gt 0 && "$DRY_RUN" == false ]]; then
  echo ""
  echo "=============================================="
  echo "IMPORTANT: Redeploy affected services"
  echo "=============================================="
  echo "Cloud Run services cache secrets at startup."
  echo "You must redeploy services to pick up the fixed values."
  echo ""
  echo "Quick redeploy (forces new revision):"
  echo "  gcloud run services update <service>-staging \\"
  echo "    --region=us-central1 \\"
  echo "    --project=$PROJECT \\"
  echo "    --update-env-vars=\"DEPLOY_TIMESTAMP=\$(date +%s)\""
  echo ""
  echo "Or redeploy all:"
  echo "  ./scripts/deploy-all-staging.sh --skip-build"
fi

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi

exit 0
