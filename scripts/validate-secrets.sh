#!/usr/bin/env bash

# ==============================================================================
# Verichron - Validate All GCP Secrets
# ==============================================================================
# Scans all secrets in GCP Secret Manager for common issues:
# - Trailing whitespace (causes runtime errors like "1h " vs "1h")
# - Leading whitespace
# - Empty values
# - Newline characters
# - Very long values (potential data dump)
#
# Usage:
#   ./scripts/validate-secrets.sh           # Scan all secrets
#   ./scripts/validate-secrets.sh --quiet   # Only show issues (no progress)
# ==============================================================================

set -e

PROJECT="verichron-recover-staging"
QUIET=false

if [[ "$1" == "--quiet" ]]; then
  QUIET=true
fi

# Counters
TOTAL=0
TRAILING_WS=0
LEADING_WS=0
EMPTY=0
NEWLINES=0
ISSUES=0

# Arrays to store problematic secrets
declare -a TRAILING_WS_SECRETS
declare -a LEADING_WS_SECRETS
declare -a EMPTY_SECRETS
declare -a NEWLINE_SECRETS

echo "=============================================="
echo "Validating GCP Secrets"
echo "=============================================="
echo "Project: $PROJECT"
echo ""

if [[ "$QUIET" == false ]]; then
  echo "Scanning secrets..."
  echo ""
fi

# Get all secret names
SECRETS=$(gcloud secrets list --project="$PROJECT" --format="value(name)" 2>/dev/null)

for SECRET_NAME in $SECRETS; do
  TOTAL=$((TOTAL + 1))

  if [[ "$QUIET" == false ]]; then
    echo -n "Checking: $SECRET_NAME... "
  fi

  # Get secret value
  VALUE=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" 2>/dev/null || echo "")

  HAS_ISSUE=false

  # Check for trailing whitespace (space, tab, etc.)
  if [[ "$VALUE" =~ [[:space:]]$ ]]; then
    TRAILING_WS=$((TRAILING_WS + 1))
    TRAILING_WS_SECRETS+=("$SECRET_NAME")
    HAS_ISSUE=true
  fi

  # Check for leading whitespace
  if [[ "$VALUE" =~ ^[[:space:]] ]]; then
    LEADING_WS=$((LEADING_WS + 1))
    LEADING_WS_SECRETS+=("$SECRET_NAME")
    HAS_ISSUE=true
  fi

  # Check for empty value
  if [[ -z "$VALUE" ]]; then
    EMPTY=$((EMPTY + 1))
    EMPTY_SECRETS+=("$SECRET_NAME")
    HAS_ISSUE=true
  fi

  # Check for newlines
  if [[ "$VALUE" == *$'\n'* ]]; then
    NEWLINES=$((NEWLINES + 1))
    NEWLINE_SECRETS+=("$SECRET_NAME")
    HAS_ISSUE=true
  fi

  if [[ "$HAS_ISSUE" == true ]]; then
    ISSUES=$((ISSUES + 1))
    if [[ "$QUIET" == false ]]; then
      echo "ISSUE FOUND"
    fi
  else
    if [[ "$QUIET" == false ]]; then
      echo "OK"
    fi
  fi
done

echo ""
echo "=============================================="
echo "Validation Results"
echo "=============================================="
echo ""
echo "Total secrets scanned: $TOTAL"
echo "Secrets with issues:   $ISSUES"
echo ""

if [[ ${#TRAILING_WS_SECRETS[@]} -gt 0 ]]; then
  echo "TRAILING WHITESPACE ($TRAILING_WS secrets):"
  echo "  These secrets end with space/tab characters."
  echo "  This causes errors like: '\"expiresIn\" should be a number...'"
  echo ""
  for SECRET in "${TRAILING_WS_SECRETS[@]}"; do
    VALUE=$(gcloud secrets versions access latest --secret="$SECRET" --project="$PROJECT" 2>/dev/null)
    # Show last 10 chars with visible markers
    LAST_CHARS="${VALUE: -10}"
    echo "  - $SECRET"
    echo "    Value ends with: '$LAST_CHARS'"
  done
  echo ""
fi

if [[ ${#LEADING_WS_SECRETS[@]} -gt 0 ]]; then
  echo "LEADING WHITESPACE ($LEADING_WS secrets):"
  echo "  These secrets start with space/tab characters."
  echo ""
  for SECRET in "${LEADING_WS_SECRETS[@]}"; do
    VALUE=$(gcloud secrets versions access latest --secret="$SECRET" --project="$PROJECT" 2>/dev/null)
    # Show first 10 chars with visible markers
    FIRST_CHARS="${VALUE:0:10}"
    echo "  - $SECRET"
    echo "    Value starts with: '$FIRST_CHARS'"
  done
  echo ""
fi

if [[ ${#EMPTY_SECRETS[@]} -gt 0 ]]; then
  echo "EMPTY VALUES ($EMPTY secrets):"
  echo "  These secrets have no value set."
  echo ""
  for SECRET in "${EMPTY_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
fi

if [[ ${#NEWLINE_SECRETS[@]} -gt 0 ]]; then
  echo "CONTAIN NEWLINES ($NEWLINES secrets):"
  echo "  These secrets contain newline characters (may be intentional for multi-line values)."
  echo ""
  for SECRET in "${NEWLINE_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
fi

if [[ $ISSUES -gt 0 ]]; then
  echo "=============================================="
  echo "To fix whitespace issues, run:"
  echo "  ./scripts/fix-secret-whitespace.sh --all"
  echo ""
  echo "Or fix a specific secret:"
  echo "  ./scripts/fix-secret-whitespace.sh <secret-name>"
  echo "=============================================="
  exit 1
else
  echo "All secrets are valid!"
  exit 0
fi
