# Query Parameter Support for Event Orchestrator

**Date**: December 3, 2025
**Status**: ✅ Complete
**Impact**: All internal analytics endpoints can now use query parameters with HMAC security

---

## What Changed

The event orchestrator now supports query parameters in internal API calls with full HMAC signature protection.

### Before (Path Only)
```typescript
// Orchestrator signed only the path
const endpoint = `/internal/analytics/summary/${orgId}`;
HmacSigner.sign('GET', endpoint, '', key, timestamp, nonce);

// Guards verified only the path
HmacSigner.verify('GET', request.path, '', key, timestamp, nonce, signature);
```

**Limitation**: Could not filter analytics queries (e.g., by debt category, state, portfolio tags)

### After (Path + Query String)
```typescript
// Orchestrator signs full URL with query params
const endpoint = `/internal/analytics/summary/${orgId}?debtCategory=MEDICAL&state=TX`;
HmacSigner.sign('GET', endpoint, '', key, timestamp, nonce);

// Guards verify full URL including query string
HmacSigner.verify('GET', request.originalUrl, '', key, timestamp, nonce, signature);
```

**Benefit**: Analytics endpoints can filter by debt category, portfolio tags, state, date ranges, etc.

---

## Files Modified

### 1. Event Orchestrator (`packages/event-orchestrator/src/orchestrators/analytics.orchestrator.ts`)

**Added**: `fetchInternal()` helper method
- Builds query strings from parameter objects
- URL-encodes all values
- Signs full endpoint (path + query string)
- Centralized HMAC signing logic

**Updated**: All fetch methods now accept optional `queryParams`
- `fetchDebtData(baseUrl, orgId, queryParams?)`
- `fetchDebtorData(baseUrl, orgId, queryParams?)`
- `fetchTransactionData(baseUrl, orgId, queryParams?)`

**Example Usage**:
```typescript
const debtData = await this.fetchDebtData(
  'http://api-debts:3000',
  'org-123',
  {
    debtCategory: 'MEDICAL',
    state: 'TX',
    portfolioTag: 'Q2-2024'
  }
);
// Makes signed request to:
// /internal/analytics/summary/org-123?debtCategory=MEDICAL&state=TX&portfolioTag=Q2-2024
```

### 2. JWT Guards (HMAC Verification)

Updated in 3 services:
- `apps/api-debts/src/core/guards/jwt.guard.ts`
- `apps/api-debtors/src/core/guards/jwt.guard.ts`
- `apps/api-transactions/src/core/guards/jwt.guard.ts`

**Changed**: `request.path` → `request.originalUrl`
```typescript
// OLD: Verified path only (stripped query string)
const path = request.path;

// NEW: Verifies full URL (includes query string)
const path = request.originalUrl;
```

**Security**: Query parameter tampering is now prevented
- Attacker cannot modify `?debtCategory=MEDICAL` to `?debtCategory=ALL`
- Signature verification fails if query params are altered

---

## Security Properties

### 1. **Query Parameter Integrity**
- Query params are included in HMAC signature
- Tampering with params invalidates the signature
- Prevents privilege escalation via param modification

### 2. **URL Encoding Consistency**
- All query values are URL-encoded before signing
- Same encoding used for verification
- Handles special characters correctly (`=`, `&`, `%`, spaces)

### 3. **Backward Compatibility**
- Endpoints without query params work unchanged
- Query string is optional (empty string if no params)
- Existing dashboard summary endpoint unaffected

---

## Testing

Verified with 6 test cases:

1. ✅ Simple path (no query params)
2. ✅ Path with single query param
3. ✅ Path with multiple query params
4. ✅ URL-encoded query params (special characters)
5. ✅ Tampering detection (rejects modified params)
6. ✅ Signature uniqueness (different params = different signatures)

All tests passed.

---

## Usage Examples

### Example 1: Geographic Analytics with Filters

```typescript
// In analytics orchestrator handler
async handleGeographicDebtorsRequested(envelope) {
  const { organizationId, debtCategory, state, portfolioTags } = envelope.data;

  const debtorData = await this.fetchInternal(
    debtorServiceUrl,
    `/internal/analytics/geographic/debtors/${organizationId}`,
    {
      debtCategory,      // 'MEDICAL'
      state,             // 'TX'
      portfolioTag: portfolioTags?.[0]  // 'Q2-2024'
    }
  );

  // Makes request to:
  // /internal/analytics/geographic/debtors/123?debtCategory=MEDICAL&state=TX&portfolioTag=Q2-2024
}
```

### Example 2: Recovery Trends with Date Range

```typescript
const transactionData = await this.fetchInternal(
  transactionServiceUrl,
  `/internal/analytics/recovery-trends/${organizationId}`,
  {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    granularity: 'monthly'
  }
);

// Makes request to:
// /internal/analytics/recovery-trends/123?startDate=2024-01-01&endDate=2024-12-31&granularity=monthly
```

### Example 3: Portfolio Performance by Type

```typescript
const portfolioData = await this.fetchInternal(
  debtServiceUrl,
  `/internal/analytics/portfolio-performance/${organizationId}`,
  {
    portfolioType: 'MEDICAL',
    minRecoveryRate: 0.15
  }
);

// Makes request to:
// /internal/analytics/portfolio-performance/123?portfolioType=MEDICAL&minRecoveryRate=0.15
```

---

## Implementation Notes

### URL Encoding
Query param values are encoded using `encodeURIComponent()`:
```typescript
const queryString = Object.entries(params)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  .join('&');
```

### Undefined Handling
`undefined` values are automatically filtered out:
```typescript
fetchInternal(url, path, {
  debtCategory: 'MEDICAL',
  state: undefined,  // Will be omitted from query string
  portfolioId: '123'
});
// Result: ?debtCategory=MEDICAL&portfolioId=123
```

### Array Parameters
For arrays, pass as comma-separated string:
```typescript
{
  portfolioTags: ['Q2-2024', 'High-Risk'].join(',')
}
// Result: ?portfolioTags=Q2-2024%2CHigh-Risk
```

---

## Migration Guide

### For New Analytics Endpoints

1. **Define event payload** with filter parameters:
```typescript
export class AnalyticsGeographicRequestedDto {
  @IsString()
  organizationId: string;

  @IsOptional()
  @IsEnum(DebtCategory)
  debtCategory?: DebtCategory;

  @IsOptional()
  @IsString()
  state?: string;
}
```

2. **Use fetchInternal** in orchestrator:
```typescript
const data = await this.fetchInternal(
  serviceUrl,
  `/internal/analytics/endpoint/${orgId}`,
  {
    debtCategory: payload.debtCategory,
    state: payload.state
  }
);
```

3. **Internal endpoint receives query params**:
```typescript
@Get('/internal/analytics/endpoint/:orgId')
async getAnalytics(
  @Param('orgId') orgId: string,
  @Query('debtCategory') debtCategory?: string,
  @Query('state') state?: string
) {
  // Query params are available and HMAC-verified
}
```

### No Changes Needed

- Existing endpoints without query params work unchanged
- Dashboard summary continues working as-is
- HmacSigner methods didn't change (already generic)

---

## Next Steps

With query param support complete, we can now implement:

1. ✅ **Debt-level classification filtering** (debtCategory enum)
2. ✅ **Portfolio tag filtering** (flexible user-defined tags)
3. ✅ **Geographic filtering** (by state)
4. ✅ **Date range filtering** (startDate, endDate)
5. ✅ **Multi-dimensional analytics** (combine filters)

All secured with HMAC signature verification.

---

**Status**: Ready for analytics feature implementation
