# Creditor Entity Resolution Test Data

This directory contains CSV test files for validating the Creditor Master + Vertex AI Entity Resolution feature.

## Test Files

### 1. `creditor-exact-match-test.csv` (30 debts)

**Purpose:** Verify **100% confidence matches** against the Gold List v0.1

**Expected Behavior:**
- All 30 creditor names should match **exactly** to the seeded Gold List
- Should create **HIGH_CONFIDENCE** conflicts (95-100% match scores)
- Platform verification flag should be `TRUE` (matched to global creditors)
- All conflicts should show green "Platform Verified" badges in UI

**Creditors Included:**
- 5 major banks (Chase, BofA, Wells Fargo, Citi, US Bank)
- 4 credit cards (Capital One, Discover, Amex, Synchrony)
- 3 auto finance (Ally, Toyota Credit, Ford Credit)
- 5 telecom (Verizon, AT&T, T-Mobile, Comcast, Charter)
- 5 utilities (ComEd, PG&E, FPL, Con Edison, Duke)
- 8 others (healthcare, student loans, retail, debt buyers)

**Total Debts:** 30
**Total Principal:** $310,155.25

---

### 2. `creditor-realistic-variations-test.csv` (50 debts)

**Purpose:** Test **confidence scoring** with realistic name variations

**Expected Behavior:**
- Name variations should produce **varied confidence scores** (40-100%)
- Tests semantic matching capabilities of Vertex AI
- Demonstrates fallback to Levenshtein when Vertex AI unavailable

**Test Cases Included:**

#### High Confidence (95-100%) - 35 debts
- Common aliases: `"Chase Bank"` → `"JPMorgan Chase Bank, N.A."`
- Known abbreviations: `"BofA"` → `"Bank of America, N.A."`
- Brand names: `"Chase"`, `"Citi"`, `"Amex"`
- Division names: `"Verizon Wireless"`, `"Ally Auto"`
- Legacy names: `"GMAC"` → `"Ally Financial Inc."`

#### Medium Confidence (70-94%) - 12 debts
- Ticker symbols: `"USB"` → `"U.S. Bank"`
- No spaces: `"CapitalOne"`, `"TMobile"`, `"ConEdison"`
- Partial matches: `"Toyota Financial"` (vs `"Toyota Motor Credit"`)
- Missing punctuation: `"PGE"` (vs `"PG&E"`)
- Informal abbreviations: `"Cap One"`, `"ATT"`, `"VZW"`

#### Low Confidence (40-69%) - 3 debts
- Generic names: `"Charter"` (without Communications)
- Ambiguous abbreviations: `"COM ED"` (space variation)
- Partial corporate names: `"Pacific Gas Electric"` (missing "and")

**Total Debts:** 50
**Total Principal:** $321,775.00

---

## How to Use

### 1. Import via UI

1. Log into ui-organizations as an admin user
2. Navigate to **Inventory → Creditor Master**
3. Click **Import Portfolio** button
4. Upload one of the CSV files
5. Monitor import progress
6. Check **Creditor Resolver** for conflicts

### 2. Import via API

```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tony.stark@stark.com","password":"Password123!"}' \
  | jq -r '.accessToken')

# Upload CSV
curl -X POST http://localhost:3003/organizations/{orgId}/imports \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-data/creditor-exact-match-test.csv" \
  -F "portfolioName=Gold List Exact Match Test"
```

### 3. Verify Results

**Check conflicts created:**
```bash
curl -X GET "http://localhost:3003/organizations/{orgId}/creditor-conflicts?status=HIGH_CONFIDENCE" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Check creditors created:**
```bash
curl -X GET "http://localhost:3003/organizations/{orgId}/creditors?onlyMasters=true" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Expected Test Results

### Exact Match Test
- ✅ 30 conflicts created (all HIGH_CONFIDENCE)
- ✅ All flagged as `isPlatformMatch: true`
- ✅ Confidence scores: 95-100%
- ✅ All temp creditors have `hasUnresolvedConflict: true`
- ✅ Green Strip UI shows "Verify & Accept All (30) Suggestions"

### Realistic Variations Test
- ✅ ~35 HIGH_CONFIDENCE conflicts (95-100%)
- ✅ ~12 MEDIUM_CONFIDENCE conflicts (70-94%)
- ✅ ~3 LOW_CONFIDENCE conflicts (40-69%)
- ✅ Mix of platform and organization-level matches
- ✅ Varied confidence scores demonstrating AI semantic matching

---

## Validation Checklist

After importing both files, verify:

- [ ] Global creditors table has 30 entries (from seed data)
- [ ] Local creditors table has temp creditors with `hasUnresolvedConflict=true`
- [ ] Conflict records created with correct status tiers
- [ ] AI match reasons are descriptive (e.g., "EIN exact match", "Platform verified match")
- [ ] Debts are linked to temp creditors (not merged yet)
- [ ] Hygiene scores calculated correctly
- [ ] Platform verification badges display in UI
- [ ] Conflict resolution workflow functional (merge, create new, dismiss)

---

## Troubleshooting

**No conflicts created:**
- Check if Global Creditors were seeded (`pnpm e2e setup`)
- Verify Vertex AI service is configured (or Levenshtein fallback active)
- Check import job status in database

**All conflicts show LOW_CONFIDENCE:**
- Vertex AI may be unavailable (check logs for fallback to Levenshtein)
- Gold List may not be seeded properly

**Debts not imported:**
- Check CSV format matches expected columns
- Verify required fields are present (Account Number, Creditor Name, Principal Amount, etc.)
- Check import job error messages

---

## Next Steps

After validating with these test files:

1. **Create production Gold List v1.0** (top 500 creditors)
2. **Test conflict resolution UI** (CreditorResolver component)
3. **Verify bulk approval workflow** (Green Strip for high-confidence matches)
4. **Test EIN override modal** (duplicate EIN detection)
5. **Measure performance** (import speed, AI response time)

---

**Last Updated:** December 27, 2025
**Related Docs:** `APPROVED-VERTEX-AI-IMPORT-STRATEGY.md`
