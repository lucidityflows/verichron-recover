# Internal API Controller Standards & Template

## 🎯 Purpose

This guide establishes standardized patterns for internal service-to-service API endpoints consumed by the event-orchestrator and other microservices. Internal controllers must follow strict conventions to prevent design drift and security vulnerabilities.

---

## 📋 Table of Contents

1. [Routing Standards](#routing-standards)
2. [Authentication](#authentication)
3. [HTTP Method Selection](#http-method-selection)
4. [Documentation Standards](#documentation-standards)
5. [Controller Template](#controller-template)
6. [Complete Example](#complete-example)
7. [Common Patterns](#common-patterns)
8. [Security Checklist](#security-checklist)

---

## 🛣️ Routing Standards

### **Standard Pattern**

```
/internal/{service-name}/{feature}
```

### **Service Name Mapping**

| Service | Route Prefix | Example |
|---------|-------------|---------|
| api-debts | `/internal/debts/analytics` | `/internal/debts/analytics/flow/:orgId` |
| api-debtors | `/internal/debtors/analytics` | `/internal/debtors/analytics/flow/:orgId` |
| api-transactions | `/internal/transactions/analytics` | `/internal/transactions/analytics/recovery-trends/:orgId` |
| api-communications | `/internal/communications/analytics` | `/internal/communications/analytics/dashboard-summary/:orgId` |
| api-collectors | `/internal/collectors` | `/internal/collectors/workload` |
| api-organizations | `/internal/organizations` | `/internal/organizations/teams/:orgId` |
| api-users | `/internal/users` | `/internal/users/provision-initial-admin` |

### **❌ Anti-Patterns (DO NOT USE)**

```typescript
// ❌ WRONG - Missing service name
@Controller('internal/analytics')

// ❌ WRONG - Inconsistent with service naming
@Controller('internal/api-debts/analytics')

// ❌ WRONG - Using hyphenated service name
@Controller('internal/api-transactions/analytics')
```

### **✅ Correct Examples**

```typescript
// ✅ CORRECT - Includes service name, matches pattern
@Controller('internal/debts/analytics')

// ✅ CORRECT - Includes service name
@Controller('internal/transactions/analytics')

// ✅ CORRECT - Non-analytics internal endpoint
@Controller('internal/collectors')
```

---

## 🔐 Authentication

### **HMAC Authentication (Recommended)**

Internal endpoints **MUST** be protected with HMAC authentication to prevent unauthorized service-to-service access. The orchestrator generates HMAC signatures using service keys.

### **Authentication Pattern**

Internal controllers should rely on the **global HMAC authentication guard** configured at the application level. Individual endpoints should use the `@Public()` decorator to bypass JWT authentication while still requiring HMAC validation.

### **Controller Configuration**

```typescript
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator'; // Path varies by service

@ApiTags('Internal - Analytics')
@Controller('internal/debts/analytics')
export class InternalAnalyticsController {

  @Get('dashboard-summary/:organizationId')
  @Public() // Bypasses JWT, still validates HMAC
  async getDashboardSummary(...) {
    // Implementation
  }
}
```

### **Global Guard Configuration**

In `main.ts` or app module:

```typescript
// Global HMAC guard checks X-Internal-Service-Name, X-Internal-Timestamp, etc.
app.useGlobalGuards(new HmacAuthGuard());
```

### **Required Headers (Sent by Orchestrator)**

```typescript
{
  'X-Internal-Service-Name': 'event-orchestrator',
  'X-Internal-Timestamp': '1703001234567',
  'X-Internal-Nonce': 'uuid-v4',
  'X-Internal-Signature': 'hmac-sha256-signature'
}
```

### **Service Key Environment Variables**

Each service must configure its service key:

```bash
# In orchestrator (caller)
SERVICE_KEY_COLLECTORS=secret-key-123
SERVICE_KEY_ORGANIZATIONS=secret-key-456

# In api-collectors (receiver)
SERVICE_KEY=secret-key-123
```

---

## 🔀 HTTP Method Selection

### **Decision Matrix**

| Use Case | HTTP Method | Rationale | Example |
|----------|-------------|-----------|---------|
| **Analytics (read-only, idempotent)** | `GET` | Cacheable, query params, RESTful | `GET /analytics/flow/:orgId?dimension=DEBT_CATEGORY` |
| **Batch lookups (multiple IDs)** | `POST` | Request body supports large payloads | `POST /collectors/workload` with body `{collectorIds: [...]}` |
| **Resource creation** | `POST` | Non-idempotent mutation | `POST /users/provision-initial-admin` |
| **Data aggregation with filters** | `GET` | Idempotent, cacheable | `GET /recovery-trends/:orgId?granularity=WEEKLY` |

### **✅ Use GET When:**
- Operation is **idempotent** (same inputs = same outputs)
- Response is **cacheable** (CDN, reverse proxy, browser cache)
- Parameters fit in query string (< ~2000 characters)
- Operation is **read-only** (no mutations)

### **✅ Use POST When:**
- Sending **large arrays** of IDs (e.g., 100+ collector IDs)
- Request payload is **complex** (nested objects, multiple arrays)
- Operation is **non-idempotent** (creates/updates resources)

### **❌ Avoid POST for Simple Analytics**

```typescript
// ❌ WRONG - Analytics query using POST unnecessarily
@Post('flow/:organizationId')
async getFlowAnalytics(@Body() body: { dimension: string }) {
  // This should be GET with query param
}

// ✅ CORRECT - Analytics query using GET
@Get('flow/:organizationId')
async getFlowAnalytics(
  @Param('organizationId') orgId: string,
  @Query('dimension') dimension: string
) {
  // Cacheable, RESTful
}
```

---

## 📝 Documentation Standards

### **Required Swagger Decorators**

Every internal endpoint **MUST** include:

1. `@ApiTags('Internal - {Feature}')` - Groups endpoints in Swagger UI
2. `@ApiOperation()` - Summary + detailed description
3. `@ApiParam()` - Documents path parameters
4. `@ApiQuery()` - Documents query parameters (for GET)
5. `@ApiResponse()` - Documents response schema

### **Documentation Template**

```typescript
@Get('dashboard-summary/:organizationId')
@Public()
@ApiOperation({
  summary: 'Get dashboard summary for organization (internal only)',
  description: `
    Aggregates debt and portfolio metrics for the dashboard.
    Called by the event orchestrator to build the dashboard summary.

    **This is an internal endpoint** - not exposed to external users.
  `,
})
@ApiParam({
  name: 'organizationId',
  description: 'Organization UUID',
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@ApiResponse({
  status: 200,
  description: 'Dashboard summary retrieved successfully',
  type: DashboardSummaryDto,
})
async getDashboardSummary(
  @Param('organizationId', ParseUUIDPipe) organizationId: string,
) {
  return this.analyticsService.getDashboardSummary(organizationId);
}
```

### **Controller-Level Documentation**

Add a JSDoc comment at the top of the controller class:

```typescript
/**
 * Internal Analytics Controller
 *
 * Routes: /internal/debts/analytics/*
 *
 * PURPOSE:
 * Provides aggregated debt and portfolio metrics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 *
 * ROUTING PATTERN: /internal/{service-name}/analytics
 * - Standardized with api-transactions (/internal/transactions/analytics)
 * - Standardized with api-debtors (/internal/debtors/analytics)
 *
 * AUTHENTICATION:
 * - Global HMAC guard validates X-Internal-* headers
 * - Endpoints use @Public() to bypass JWT while requiring HMAC
 *
 * CONSUMED BY:
 * - event-orchestrator (analytics-dashboard.orchestrator.ts)
 * - event-orchestrator (analytics-flow.orchestrator.ts)
 */
@ApiTags('Internal - Analytics')
@Controller('internal/debts/analytics')
export class InternalAnalyticsController {
  // ...
}
```

---

## 🏗️ Controller Template

```typescript
import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator'; // Adjust path
import { YourService } from './your.service';
import { YourResponseDto, YourQueryDto } from './dto';

/**
 * Internal {Feature} Controller
 *
 * Routes: /internal/{service-name}/{feature}/*
 *
 * PURPOSE:
 * [Describe what this controller provides and why]
 *
 * ROUTING PATTERN: /internal/{service-name}/{feature}
 * - Standardized with other services
 *
 * AUTHENTICATION:
 * - Global HMAC guard validates X-Internal-* headers
 * - Endpoints use @Public() to bypass JWT while requiring HMAC
 *
 * CONSUMED BY:
 * - event-orchestrator ({specific orchestrator files})
 * - {other services if applicable}
 *
 * DESIGN DECISIONS:
 * - HTTP Method: GET for analytics (cacheable, idempotent)
 * - HTTP Method: POST for batch operations (large payloads)
 */
@ApiTags('Internal - {Feature}')
@Controller('internal/{service-name}/{feature}')
export class Internal{Feature}Controller {
  constructor(private readonly yourService: YourService) {}

  /**
   * Example GET endpoint for analytics
   */
  @Get('analytics-endpoint/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get analytics data (internal only)',
    description: `
      [Detailed description of what this endpoint does]
      Called by the event orchestrator to [specific use case].

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'periodStart',
    description: 'Start of period (ISO 8601)',
    required: false,
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
    type: YourResponseDto,
  })
  async getAnalyticsData(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: YourQueryDto,
  ): Promise<YourResponseDto> {
    return this.yourService.getAnalyticsData(organizationId, query);
  }

  /**
   * Example POST endpoint for batch operations
   */
  @Post('batch-lookup')
  @Public()
  @ApiOperation({
    summary: 'Batch lookup data by IDs (internal only)',
    description: `
      [Detailed description of batch operation]
      Called by the event orchestrator for batch processing.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch data retrieved successfully',
    type: YourResponseDto,
  })
  async batchLookup(
    @Body() body: { organizationId: string; ids: string[] },
  ): Promise<YourResponseDto> {
    return this.yourService.batchLookup(body.organizationId, body.ids);
  }
}
```

---

## 📦 Complete Example

### **api-transactions Internal Analytics Controller**

```typescript
import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { InternalAnalyticsService } from './analytics.service';
import {
  RecoveryTrendsQueryDto,
  RecoveryTrendsResponseDto,
  PaymentStatsResponseDto,
  PortfolioPaymentStatsDto,
} from './dto';

/**
 * Internal Analytics Controller
 *
 * Routes: /internal/transactions/analytics/*
 *
 * PURPOSE:
 * Provides aggregated payment and transaction metrics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 *
 * ROUTING PATTERN: /internal/transactions/analytics
 * - Standardized with api-debts (/internal/debts/analytics)
 * - Standardized with api-debtors (/internal/debtors/analytics)
 *
 * AUTHENTICATION:
 * - Global HMAC guard validates X-Internal-* headers
 * - Endpoints use @Public() to bypass JWT while requiring HMAC
 *
 * CONSUMED BY:
 * - event-orchestrator (analytics-recovery-trends.orchestrator.ts)
 * - event-orchestrator (analytics-portfolio-performance.orchestrator.ts)
 * - event-orchestrator (analytics-dashboard.orchestrator.ts)
 *
 * DESIGN DECISIONS:
 * - HTTP Method: GET for all analytics endpoints (cacheable, idempotent)
 * - Query params for filtering (granularity, date ranges, portfolios)
 * - POST for portfolio-payments endpoint (accepts large debt-to-portfolio mapping)
 */
@ApiTags('Internal - Analytics')
@Controller('internal/transactions/analytics')
export class InternalAnalyticsController {
  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('recovery-trends/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get payment data for recovery trends (internal only)',
    description: `
      Retrieves payment data grouped by time period for trend analysis.
      Called by the event orchestrator to build recovery trends visualization.

      Supports multiple granularities: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'granularity',
    description: 'Time period granularity',
    required: true,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
  })
  @ApiQuery({
    name: 'periodStart',
    description: 'Start of analysis period (ISO 8601)',
    required: false,
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'periodEnd',
    description: 'End of analysis period (ISO 8601)',
    required: false,
    example: '2025-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Recovery trend data retrieved successfully',
    type: RecoveryTrendsResponseDto,
  })
  async getRecoveryTrends(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: RecoveryTrendsQueryDto,
  ): Promise<RecoveryTrendsResponseDto> {
    return this.analyticsService.getRecoveryTrends(organizationId, query);
  }

  @Post('portfolio-payments/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get payment stats for specific portfolios (internal only)',
    description: `
      Accepts a debt-to-portfolio mapping and returns payment statistics
      aggregated by portfolio.

      Uses POST because the debt mapping can be large (1000s of debts).

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio payment statistics retrieved successfully',
    type: PortfolioPaymentStatsDto,
  })
  async getPortfolioPayments(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: { debtPortfolioMap: Record<string, string> },
  ): Promise<PortfolioPaymentStatsDto> {
    return this.analyticsService.getPortfolioPayments(
      organizationId,
      body.debtPortfolioMap,
    );
  }

  @Get('dashboard-summary/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get transaction summary for dashboard (internal only)',
    description: `
      Aggregates transaction metrics for the organization dashboard.
      Called by the event orchestrator to build the dashboard summary.

      Returns: totalCollected, successfulPayments, failedPayments, pendingPayments.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: PaymentStatsResponseDto,
  })
  async getDashboardSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PaymentStatsResponseDto> {
    return this.analyticsService.getDashboardSummary(organizationId);
  }
}
```

---

## 🔁 Common Patterns

### **Pattern 1: Debtor Focus Endpoints**

Multiple services provide debtor-specific data for the "360-degree debtor view":

```typescript
// api-debts/internal/analytics.controller.ts
@Get('debtor-focus/:organizationId/:debtorProfileId')
async getDebtorDebts(...) { /* Returns all debts for debtor */ }

// api-transactions/internal/analytics.controller.ts
@Get('debtor-focus/:organizationId/:debtorProfileId')
async getDebtorTransactions(...) { /* Returns payment history */ }

// api-communications/internal/analytics.controller.ts
@Get('debtor-focus/:organizationId/:debtorProfileId')
async getDebtorCommunications(...) { /* Returns communication log */ }
```

**Orchestrator Usage:**
```typescript
// analytics-debtor-focus.orchestrator.ts
const [debts, transactions, communications] = await Promise.all([
  this.fetchDebtorDebts(...),
  this.fetchDebtorTransactions(...),
  this.fetchDebtorCommunications(...),
]);
```

### **Pattern 2: Organization-Wide Stats**

Leaderboard-style endpoints aggregating data across all collectors:

```typescript
@Get('organization-stats/:organizationId')
@ApiQuery({ name: 'periodStart', required: true })
@ApiQuery({ name: 'periodEnd', required: true })
async getOrganizationStats(
  @Param('organizationId') orgId: string,
  @Query('periodStart') periodStart: string,
  @Query('periodEnd') periodEnd: string,
): Promise<OrganizationStatsDto> {
  // Returns stats grouped by collectorUserId
}
```

**Response Structure:**
```typescript
{
  collectorStats: [
    {
      collectorUserId: 'uuid-1',
      totalCollected: 50000,
      successfulPayments: 120,
      // ...
    }
  ]
}
```

### **Pattern 3: Batch Collector Data**

POST endpoints for fetching data about multiple collectors:

```typescript
@Post('workload')
@Public()
async getCollectorWorkload(
  @Body() dto: { organizationId: string; collectorIds: string[] }
): Promise<{ workload: Record<string, number> }> {
  // Returns { "collector-uuid-1": 45, "collector-uuid-2": 32 }
}
```

### **Pattern 4: Dashboard Metrics (Period + Today)**

Optimized endpoints returning both period stats AND today's stats in one call:

```typescript
@Get('collectors/:collectorUserId/dashboard-metrics')
@ApiQuery({ name: 'organizationId', required: true })
@ApiQuery({ name: 'periodStart', required: true })
@ApiQuery({ name: 'periodEnd', required: true })
async getCollectorDashboardMetrics(
  @Param('collectorUserId') collectorId: string,
  @Query('organizationId') orgId: string,
  @Query('periodStart') periodStart: string,
  @Query('periodEnd') periodEnd: string,
): Promise<CollectorDashboardMetricsDto> {
  return {
    // Period stats
    totalCalls: 150,
    totalEmails: 200,
    totalCollected: 75000,

    // Today's stats (calculated internally)
    totalCollectedToday: 2500,
  };
}
```

**Rationale:** Single network call for dashboard rendering instead of 2 separate queries.

---

## ✅ Security Checklist

Before deploying any internal controller, verify:

- [ ] **Routing follows `/internal/{service-name}/{feature}` pattern**
- [ ] **Controller uses `@Public()` decorator on all endpoints**
- [ ] **Global HMAC guard is configured in `main.ts`**
- [ ] **Service key environment variable is documented**
- [ ] **Orchestrator has matching service key configured**
- [ ] **All endpoints have `@ApiOperation()` with "internal only" disclaimer**
- [ ] **HTTP method choice is documented in controller-level JSDoc**
- [ ] **GET is used for idempotent analytics queries**
- [ ] **POST is used for batch operations with large payloads**
- [ ] **All parameters have `@ApiParam()` or `@ApiQuery()` decorators**
- [ ] **All responses have `@ApiResponse()` with DTO type**
- [ ] **No sensitive data (passwords, tokens) in query params**
- [ ] **No external exposure via API gateway routing**

---

## 🔧 Migration Checklist

### **For Existing Controllers with Wrong Routing**

If you find an internal controller with incorrect routing (e.g., `/internal/analytics` instead of `/internal/{service}/analytics`):

1. **Update Controller Route:**
   ```typescript
   // Before
   @Controller('internal/analytics')

   // After
   @Controller('internal/transactions/analytics')
   ```

2. **Update All Orchestrator Calls:**
   ```typescript
   // Before
   `/internal/analytics/recovery-trends/${orgId}`

   // After
   `/internal/transactions/analytics/recovery-trends/${orgId}`
   ```

3. **Add Routing Documentation:**
   ```typescript
   /**
    * ROUTING PATTERN: /internal/transactions/analytics
    * - Standardized with api-debts (/internal/debts/analytics)
    */
   ```

4. **Verify HMAC Authentication:**
   - Check for `@Public()` decorator on endpoints
   - Verify global HMAC guard is configured
   - Test with orchestrator's HMAC signature

5. **Update OpenAPI Specs:**
   - Regenerate OpenAPI JSON
   - Verify Swagger UI shows correct routes

6. **Test End-to-End:**
   - Trigger orchestrator that calls the endpoint
   - Verify HMAC authentication succeeds
   - Verify data is returned correctly

---

## 📚 Additional Resources

- **HMAC Implementation:** See `@verichron/security` package for `HmacSigner` utility
- **Orchestrator Patterns:** See `/packages/event-orchestrator/src/orchestrators/` for examples
- **DTO Standards:** See `@verichron/contracts` for shared interface definitions
- **Event Patterns:** See `@verichron/events` for event types and topics

---

## 🚨 Common Mistakes to Avoid

### **Mistake 1: Using Wrong Routing Pattern**
```typescript
// ❌ WRONG
@Controller('internal/analytics')

// ✅ CORRECT
@Controller('internal/transactions/analytics')
```

### **Mistake 2: Missing @Public() Decorator**
```typescript
// ❌ WRONG - Will require JWT token
@Get('dashboard-summary/:organizationId')
async getDashboardSummary(...) {}

// ✅ CORRECT - Bypasses JWT, validates HMAC
@Get('dashboard-summary/:organizationId')
@Public()
async getDashboardSummary(...) {}
```

### **Mistake 3: Using POST for Simple Analytics**
```typescript
// ❌ WRONG - Should be GET (cacheable)
@Post('recovery-trends/:organizationId')
async getRecoveryTrends(...) {}

// ✅ CORRECT - GET with query params
@Get('recovery-trends/:organizationId')
async getRecoveryTrends(
  @Query('granularity') granularity: string
) {}
```

### **Mistake 4: Missing Internal Documentation**
```typescript
// ❌ WRONG - No indication this is internal-only
@ApiOperation({ summary: 'Get dashboard summary' })

// ✅ CORRECT - Clearly marked as internal
@ApiOperation({
  summary: 'Get dashboard summary (internal only)',
  description: '**This is an internal endpoint** - not exposed to external users.'
})
```

### **Mistake 5: No Response DTO**
```typescript
// ❌ WRONG - Generic return type
@ApiResponse({ status: 200, description: 'Success' })
async getStats(): Promise<any> {}

// ✅ CORRECT - Typed response DTO
@ApiResponse({ status: 200, type: DashboardStatsDto })
async getStats(): Promise<DashboardStatsDto> {}
```

---

## 🎓 Summary

1. **Always use `/internal/{service-name}/{feature}` routing**
2. **Always use `@Public()` decorator with HMAC validation**
3. **Use GET for analytics, POST for batches**
4. **Document everything with Swagger decorators**
5. **Mark all endpoints as "internal only" in descriptions**
6. **Follow existing patterns for consistency**
7. **Test HMAC authentication end-to-end**

This standardization prevents:
- ❌ Routing inconsistencies across services
- ❌ Security vulnerabilities (missing HMAC)
- ❌ Performance issues (POST instead of cacheable GET)
- ❌ Documentation gaps (missing Swagger annotations)
- ❌ Design drift (non-standard patterns)
