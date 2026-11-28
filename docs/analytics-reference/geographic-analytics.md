# Geographic Analytics API Contracts

**Document Version:** 2.0
**Date:** October 1, 2025
**Last Updated:** Enhanced with debtor behavior analytics and portfolio filtering
**Objective:** Define API endpoints and data structures for advanced geographic heat map visualizations on the Company Analytics page.

---

## Overview

This document outlines the **Geographic Intelligence Platform** - a comprehensive mapping feature that will be added to the Company Analytics page as a major differentiator. This system provides:

- **Spatial insights** into debtor concentrations and original creditor locations
- **Behavioral analytics** showing payment plan engagement, responsiveness, and default risk by location
- **Portfolio-specific filtering** (by ID, name, or type/category)
- **Debt age analysis** showing geographic patterns of aging receivables
- **Predictive heat maps** for likelihood to pay, default risk, and engagement potential

This feature elevates the Company Analytics page beyond standard dashboards by visualizing the geographic distribution of collection performance and debtor behavior patterns.

## Data Foundation Analysis

### Current State

**✅ Existing Infrastructure:**
- `IAddress` interface with `latitude` and `longitude` fields (optional)
- `IEntityAddress` polymorphic join table linking addresses to entities
- `EntityCategory` enum supporting: `USER`, `DEBTOR`, `DEBT_OWNER`, `COMPANY`
- Faker mock data generating ~200+ addresses with realistic US locations
- Entity-address relationships (1-2 addresses per debtor/company)

**⚠️ Critical Data Gaps (MUST BE FIXED):**

1. **Latitude/Longitude Not Generated:** Mock addresses have `lat/lng` fields but they're not populated
   - **Required:** Implement `getStateCoordinates()` helper with all 50 US state centroids
   - **Required:** Add variance to coordinates for realistic city-level distribution

2. **Original Creditor Addresses - MISSING CRITICAL DATA:**
   - **Problem:** `debt.originalCreditorId` exists, but original creditor entities may not have addresses in `entity_addresses`
   - **Required:** Ensure ALL companies that serve as original creditors have addresses linked via `entity_addresses`
   - **Required:** Create entity_address records with `entity_category = 'company'` or `'debt-owner'`
   - **Impact:** Cannot show "Original Creditor Locations" map view without this data

3. **Portfolio Type/Category - NEW REQUIREMENT:**
   - **Problem:** No `portfolio_type` or `category` field exists on `portfolios` table
   - **Required:** Add `portfolioType` enum field: `AUTO_LOAN`, `CREDIT_CARD`, `MEDICAL_COLLECTIONS`, `STUDENT_LOAN`, `PERSONAL_LOAN`, `UTILITY`, `TELECOM`
   - **Required:** Update seeder to assign realistic types to portfolios
   - **Impact:** Enables portfolio type filtering (e.g., "Show all medical debt >7 years")

4. **Debtor Behavior Tracking - NEW REQUIREMENT:**
   - **Problem:** No fields to track debtor engagement/behavior
   - **Required:** Add to `debts` or `debtors` table:
     - `hasActivePaymentPlan` (boolean)
     - `paymentPlanCompletedAt` (timestamp, nullable)
     - `lastContactDate` (timestamp)
     - `contactAttempts` (integer)
     - `isResponsive` (boolean, calculated from contact history)
     - `likelihoodToPayScore` (0-100, ML-generated or rule-based)
     - `defaultRiskScore` (0-100, ML-generated or rule-based)
   - **Impact:** Enables all behavioral heat maps (responsive, likely to pay, at-risk, etc.)

5. **Debt Age Calculation:**
   - **Current:** `debt.dueDate` exists but age buckets not pre-calculated
   - **Required:** Calculate age from `CURRENT_DATE - dueDate` or `createdAt` for visualizations

---

## API Endpoints

### Core Query Parameters (Shared Across All Endpoints)

All geographic endpoints support these query parameters for filtering:

```typescript
{
  // Portfolio filtering
  portfolioId?: string;              // Filter by specific portfolio UUID
  portfolioName?: string;            // Filter by portfolio name (partial match)
  portfolioType?: PortfolioType;     // Filter by type: 'AUTO_LOAN' | 'CREDIT_CARD' | 'MEDICAL_COLLECTIONS' | etc.

  // Debt age filtering
  debtAgeMin?: number;               // Minimum debt age in days
  debtAgeMax?: number;               // Maximum debt age in days
  debtAgeBucket?: '0-30' | '31-60' | '61-90' | '91-180' | '180-365' | '365+';

  // Behavior filtering
  hasPaymentPlan?: boolean;          // Filter debtors with/without payment plans
  isResponsive?: boolean;            // Filter by responsiveness
  likelihoodToPayMin?: number;       // Minimum likelihood score (0-100)
  defaultRiskMax?: number;           // Maximum default risk score (0-100)
}
```

---

### 1. Debtor Geographic Distribution (Enhanced)

#### GET `/api/company/{companyId}/analytics/geography/debtors`

Returns aggregated debtor counts and debt values by state for all debts owned by a company.

**Parameters:**
- `companyId` (path, UUID, required) - Company ID

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:** `200 OK`
```typescript
{
  type: 'debtors',
  totalDebtors: number;
  totalDebtValue: number;
  states: Array<{
    stateCode: string;        // 'CA', 'TX', 'NY', etc.
    stateName: string;         // 'California', 'Texas', etc.
    debtorCount: number;
    totalDebtValue: number;
    averageDebtValue: number;
    activeDebts: number;
    paidDebts: number;
    defaultedDebts: number;
    recoveryRate: number;      // % of debt recovered
    coordinates: {             // State centroid for mapping
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
-- Get debtor addresses for company's debts
WITH debtor_locations AS (
  SELECT
    d.id AS debt_id,
    d.balance,
    d.original_balance,
    d.status,
    d.is_paid,
    addr.state,
    addr.city,
    addr.latitude,
    addr.longitude,
    deb.id AS debtor_id
  FROM debts d
  INNER JOIN debtors deb ON deb.id = d.debtor_id
  INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
    AND ea.entity_category = 'debtor'
    AND ea.valid_to IS NULL  -- Current address only
  INNER JOIN addresses addr ON addr.id = ea.address_id
  WHERE d.debt_owner_id = $1
)
SELECT
  state AS stateCode,
  COUNT(DISTINCT debtor_id) AS debtorCount,
  SUM(balance) AS totalDebtValue,
  AVG(balance) AS averageDebtValue,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeDebts,
  SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END) AS paidDebts,
  SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) AS defaultedDebts,
  -- Recovery rate calculation
  CASE
    WHEN SUM(original_balance) > 0 THEN
      (SUM(original_balance) - SUM(balance)) / SUM(original_balance)
    ELSE 0
  END AS recoveryRate,
  -- State centroid (approximation or from lookup table)
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude
FROM debtor_locations
GROUP BY state
ORDER BY debtorCount DESC;
```

---

### 2. Original Creditor Geographic Distribution

#### GET `/api/company/{companyId}/analytics/geography/creditors`

Returns aggregated debt value by original creditor location.

**Parameters:**
- `companyId` (path, UUID, required) - Company ID

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:** `200 OK`
```typescript
{
  type: 'creditors',
  totalCreditors: number;
  totalDebtValue: number;
  states: Array<{
    stateCode: string;
    stateName: string;
    creditorCount: number;
    totalDebtValue: number;
    averageDebtValue: number;
    topCreditors: Array<{
      id: string;
      name: string;
      debtValue: number;
    }>;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
-- Get original creditor addresses for company's debts
WITH creditor_locations AS (
  SELECT
    d.original_creditor_id,
    c.name AS creditor_name,
    SUM(d.original_balance) AS debt_value,
    addr.state,
    addr.latitude,
    addr.longitude
  FROM debts d
  INNER JOIN companies c ON c.id = d.original_creditor_id
  INNER JOIN entity_addresses ea ON ea.entity_id = c.id
    AND ea.entity_category IN ('company', 'debt-owner')
    AND ea.valid_to IS NULL
  INNER JOIN addresses addr ON addr.id = ea.address_id
  WHERE d.debt_owner_id = $1
  GROUP BY d.original_creditor_id, c.name, addr.state, addr.latitude, addr.longitude
)
SELECT
  state AS stateCode,
  COUNT(DISTINCT original_creditor_id) AS creditorCount,
  SUM(debt_value) AS totalDebtValue,
  AVG(debt_value) AS averageDebtValue,
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude,
  -- Top 3 creditors per state
  ARRAY_AGG(
    json_build_object(
      'id', original_creditor_id,
      'name', creditor_name,
      'debtValue', debt_value
    ) ORDER BY debt_value DESC LIMIT 3
  ) AS topCreditors
FROM creditor_locations
GROUP BY state
ORDER BY totalDebtValue DESC;
```

---

### 3. Combined Geographic View (Heatmap Overlay)

#### GET `/api/company/{companyId}/analytics/geography/combined`

Returns both debtor and creditor geographic data for overlay visualization.

**Parameters:**
- `companyId` (path, UUID, required) - Company ID
- `metric` (query, string, optional) - What to visualize: `debtorCount`, `debtValue`, `recoveryRate`

**Response:** `200 OK`
```typescript
{
  debtors: { /* Same as endpoint 1 */ },
  creditors: { /* Same as endpoint 2 */ },
  flows: Array<{
    originState: string;        // Creditor state
    destinationState: string;   // Debtor state
    debtValue: number;
    debtCount: number;
  }>;
}
```

**SQL Logic:**
```sql
-- Debt flows from creditor state to debtor state
SELECT
  creditor_addr.state AS originState,
  debtor_addr.state AS destinationState,
  SUM(d.original_balance) AS debtValue,
  COUNT(DISTINCT d.id) AS debtCount
FROM debts d
-- Creditor location
INNER JOIN companies c ON c.id = d.original_creditor_id
INNER JOIN entity_addresses cea ON cea.entity_id = c.id
  AND cea.entity_category IN ('company', 'debt-owner')
  AND cea.valid_to IS NULL
INNER JOIN addresses creditor_addr ON creditor_addr.id = cea.address_id
-- Debtor location
INNER JOIN debtors deb ON deb.id = d.debtor_id
INNER JOIN entity_addresses dea ON dea.entity_id = deb.id
  AND dea.entity_category = 'debtor'
  AND dea.valid_to IS NULL
INNER JOIN addresses debtor_addr ON debtor_addr.id = dea.address_id
WHERE d.debt_owner_id = $1
GROUP BY creditor_addr.state, debtor_addr.state
ORDER BY debtValue DESC;
```

---

### 4. Debtor Behavioral Analytics - Payment Plan Engagement

#### GET `/api/company/{companyId}/analytics/geography/payment-plans`

Returns geographic distribution of debtors on active payment plans and successfully completed plans.

**Query Parameters:** (See Core Query Parameters above)

**Response:** `200 OK`
```typescript
{
  type: 'payment-plans',
  totalDebtorsWithPlans: number;
  activePlans: number;
  completedPlans: number;
  states: Array<{
    stateCode: string;
    stateName: string;

    // Active payment plan metrics
    activePaymentPlanCount: number;
    activePaymentPlanDebtValue: number;
    averageMonthlyPayment: number;

    // Completed payment plan metrics
    completedPaymentPlanCount: number;
    completedPaymentPlanTotalRecovered: number;
    averageCompletionTimeMonths: number;

    // Performance indicators
    paymentPlanSuccessRate: number;    // % of plans that complete successfully
    averageComplianceRate: number;     // % of scheduled payments made on time

    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
WITH payment_plan_debtors AS (
  SELECT
    d.id,
    d.balance,
    d.has_active_payment_plan,
    d.payment_plan_completed_at,
    addr.state,
    addr.latitude,
    addr.longitude,
    EXTRACT(EPOCH FROM (d.payment_plan_completed_at - d.payment_plan_started_at)) / 2592000 AS completion_months -- seconds to months
  FROM debts d
  INNER JOIN debtors deb ON deb.id = d.debtor_id
  INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
    AND ea.entity_category = 'debtor'
    AND ea.valid_to IS NULL
  INNER JOIN addresses addr ON addr.id = ea.address_id
  WHERE d.debt_owner_id = $1
    AND (d.has_active_payment_plan = true OR d.payment_plan_completed_at IS NOT NULL)
)
SELECT
  state AS stateCode,
  COUNT(*) FILTER (WHERE has_active_payment_plan = true) AS activePaymentPlanCount,
  COUNT(*) FILTER (WHERE payment_plan_completed_at IS NOT NULL) AS completedPaymentPlanCount,
  SUM(balance) FILTER (WHERE has_active_payment_plan = true) AS activePaymentPlanDebtValue,
  AVG(completion_months) AS averageCompletionTimeMonths,
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude
FROM payment_plan_debtors
GROUP BY state
ORDER BY activePaymentPlanCount DESC;
```

---

### 5. Debtor Behavioral Analytics - Responsiveness

#### GET `/api/company/{companyId}/analytics/geography/responsiveness`

Returns geographic distribution of responsive vs unresponsive debtors.

**Query Parameters:** (See Core Query Parameters above)

**Response:** `200 OK`
```typescript
{
  type: 'responsiveness',
  totalContacted: number;
  responsive: number;
  unresponsive: number;
  states: Array<{
    stateCode: string;
    stateName: string;

    // Contact metrics
    totalDebtorsContacted: number;
    responsiveDebtors: number;
    unresponsiveDebtors: number;
    responsivenessRate: number;        // % who respond to contact attempts

    // Engagement details
    averageContactAttempts: number;
    averageResponseTime: number;       // Hours until first response
    preferredContactMethod: 'phone' | 'email' | 'sms' | 'mail';

    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
SELECT
  addr.state AS stateCode,
  COUNT(DISTINCT d.id) AS totalDebtorsContacted,
  COUNT(*) FILTER (WHERE d.is_responsive = true) AS responsiveDebtors,
  COUNT(*) FILTER (WHERE d.is_responsive = false) AS unresponsiveDebtors,
  AVG(d.contact_attempts) AS averageContactAttempts,
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude
FROM debts d
INNER JOIN debtors deb ON deb.id = d.debtor_id
INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
  AND ea.entity_category = 'debtor'
  AND ea.valid_to IS NULL
INNER JOIN addresses addr ON addr.id = ea.address_id
WHERE d.debt_owner_id = $1
  AND d.last_contact_date IS NOT NULL
GROUP BY addr.state
ORDER BY responsivenessRate DESC;
```

---

### 6. Debtor Behavioral Analytics - Likelihood to Pay

#### GET `/api/company/{companyId}/analytics/geography/likelihood-to-pay`

Returns geographic heat map of debtors by likelihood to pay score.

**Query Parameters:** (See Core Query Parameters above)

**Response:** `200 OK`
```typescript
{
  type: 'likelihood-to-pay',
  averageLikelihoodScore: number;
  states: Array<{
    stateCode: string;
    stateName: string;

    // Likelihood metrics
    debtorCount: number;
    averageLikelihoodScore: number;    // 0-100

    // Score distribution
    highLikelihood: number;            // Score >= 70
    mediumLikelihood: number;          // Score 40-69
    lowLikelihood: number;             // Score < 40

    // Financial potential
    totalDebtValueHighLikelihood: number;
    projectedRecovery: number;         // Based on likelihood scores

    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
SELECT
  addr.state AS stateCode,
  COUNT(DISTINCT d.id) AS debtorCount,
  AVG(d.likelihood_to_pay_score) AS averageLikelihoodScore,
  COUNT(*) FILTER (WHERE d.likelihood_to_pay_score >= 70) AS highLikelihood,
  COUNT(*) FILTER (WHERE d.likelihood_to_pay_score BETWEEN 40 AND 69) AS mediumLikelihood,
  COUNT(*) FILTER (WHERE d.likelihood_to_pay_score < 40) AS lowLikelihood,
  SUM(d.balance) FILTER (WHERE d.likelihood_to_pay_score >= 70) AS totalDebtValueHighLikelihood,
  SUM(d.balance * (d.likelihood_to_pay_score / 100.0)) AS projectedRecovery,
  AVG(addr.latitude) AS latitude,
  AVG(addr.longitude) AS longitude
FROM debts d
INNER JOIN debtors deb ON deb.id = d.debtor_id
INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
  AND ea.entity_category = 'debtor'
  AND ea.valid_to IS NULL
INNER JOIN addresses addr ON addr.id = ea.address_id
WHERE d.debt_owner_id = $1
GROUP BY addr.state
ORDER BY averageLikelihoodScore DESC;
```

---

### 7. Debtor Behavioral Analytics - Default Risk

#### GET `/api/company/{companyId}/analytics/geography/default-risk`

Returns geographic heat map of debtors likely to default (again) by location.

**Query Parameters:** (See Core Query Parameters above)

**Response:** `200 OK`
```typescript
{
  type: 'default-risk',
  averageDefaultRisk: number;
  states: Array<{
    stateCode: string;
    stateName: string;

    // Risk metrics
    debtorCount: number;
    averageDefaultRiskScore: number;   // 0-100

    // Risk distribution
    highRisk: number;                  // Score >= 70
    mediumRisk: number;                // Score 40-69
    lowRisk: number;                   // Score < 40

    // At-risk debt value
    totalDebtValueAtRisk: number;      // High + medium risk debt value
    projectedLoss: number;             // Based on risk scores

    // Indicators
    recentDefaultRate: number;         // % defaulted in last 90 days
    activeDefaultCount: number;        // Currently in default status

    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
SELECT
  addr.state AS stateCode,
  COUNT(DISTINCT d.id) AS debtorCount,
  AVG(d.default_risk_score) AS averageDefaultRiskScore,
  COUNT(*) FILTER (WHERE d.default_risk_score >= 70) AS highRisk,
  COUNT(*) FILTER (WHERE d.default_risk_score BETWEEN 40 AND 69) AS mediumRisk,
  COUNT(*) FILTER (WHERE d.default_risk_score < 40) AS lowRisk,
  SUM(d.balance) FILTER (WHERE d.default_risk_score >= 40) AS totalDebtValueAtRisk,
  SUM(d.balance * (d.default_risk_score / 100.0)) AS projectedLoss,
  COUNT(*) FILTER (WHERE d.status = 'defaulted') AS activeDefaultCount,
  AVG(addr.latitude) AS latitude,
  AVG(addr.longitude) AS longitude
FROM debts d
INNER JOIN debtors deb ON deb.id = d.debtor_id
INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
  AND ea.entity_category = 'debtor'
  AND ea.valid_to IS NULL
INNER JOIN addresses addr ON addr.id = ea.address_id
WHERE d.debt_owner_id = $1
GROUP BY addr.state
ORDER BY averageDefaultRiskScore DESC;
```

---

### 8. Debt Age Geographic Distribution

#### GET `/api/company/{companyId}/analytics/geography/debt-age`

Returns geographic distribution of aging receivables.

**Query Parameters:** (See Core Query Parameters above)

**Response:** `200 OK`
```typescript
{
  type: 'debt-age',
  states: Array<{
    stateCode: string;
    stateName: string;

    // Age distribution
    age0to30: { count: number; totalValue: number };
    age31to60: { count: number; totalValue: number };
    age61to90: { count: number; totalValue: number };
    age91to180: { count: number; totalValue: number };
    age180to365: { count: number; totalValue: number };
    age365plus: { count: number; totalValue: number };

    // Aggregate metrics
    totalDebts: number;
    totalDebtValue: number;
    averageDebtAge: number;            // Days

    // Performance by age
    recoveryRateByAge: {
      '0-30': number;
      '31-60': number;
      '61-90': number;
      '91-180': number;
      '180-365': number;
      '365+': number;
    };

    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
}
```

**SQL Logic:**
```sql
WITH aged_debts AS (
  SELECT
    d.*,
    addr.state,
    addr.latitude,
    addr.longitude,
    CURRENT_DATE - d.due_date AS age_days,
    CASE
      WHEN CURRENT_DATE - d.due_date <= 30 THEN '0-30'
      WHEN CURRENT_DATE - d.due_date <= 60 THEN '31-60'
      WHEN CURRENT_DATE - d.due_date <= 90 THEN '61-90'
      WHEN CURRENT_DATE - d.due_date <= 180 THEN '91-180'
      WHEN CURRENT_DATE - d.due_date <= 365 THEN '180-365'
      ELSE '365+'
    END AS age_bucket
  FROM debts d
  INNER JOIN debtors deb ON deb.id = d.debtor_id
  INNER JOIN entity_addresses ea ON ea.entity_id = deb.id
    AND ea.entity_category = 'debtor'
    AND ea.valid_to IS NULL
  INNER JOIN addresses addr ON addr.id = ea.address_id
  WHERE d.debt_owner_id = $1
)
SELECT
  state AS stateCode,

  -- Age buckets
  COUNT(*) FILTER (WHERE age_bucket = '0-30') AS age0to30Count,
  SUM(balance) FILTER (WHERE age_bucket = '0-30') AS age0to30Value,
  COUNT(*) FILTER (WHERE age_bucket = '31-60') AS age31to60Count,
  SUM(balance) FILTER (WHERE age_bucket = '31-60') AS age31to60Value,
  -- ... repeat for all buckets

  -- Aggregates
  COUNT(*) AS totalDebts,
  SUM(balance) AS totalDebtValue,
  AVG(age_days) AS averageDebtAge,
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude
FROM aged_debts
GROUP BY state
ORDER BY totalDebtValue DESC;
```

---

## Data Requirements & Enhancements

### 1. Update Mock Data Generator

File: `@verichron/mock-data/src/data-generator.ts`

**Changes Needed:**

```typescript
// In generateContactInfo() method, line 165-176:
this.addresses = Array.from({ length: addrCount }, () => {
  const state = faker.location.state({ abbreviated: true });
  const city = faker.location.city();

  // Generate realistic lat/long for the state
  const { latitude, longitude } = this.getStateCoordinates(state);

  return {
    id: faker.string.uuid(),
    street1: faker.location.streetAddress(),
    street2: faker.datatype.boolean({ probability: 0.3 })
      ? faker.location.secondaryAddress() : undefined,
    city,
    state,
    postalCode: faker.location.zipCode(),
    addressCategory: faker.helpers.arrayElement(Object.values(AddressCategory)),
    country: 'US',
    latitude: latitude + faker.number.float({ min: -0.5, max: 0.5 }), // Add variance
    longitude: longitude + faker.number.float({ min: -0.5, max: 0.5 }),
    createdAt: faker.date.past({ years: 2 }),
    updatedAt: faker.date.recent(),
  };
});

// Add helper method for state centroids
private getStateCoordinates(stateCode: string): { latitude: number; longitude: number } {
  // Map of US state abbreviations to approximate centroids
  const stateCentroids: Record<string, { latitude: number; longitude: number }> = {
    'AL': { latitude: 32.806671, longitude: -86.791130 },
    'AK': { latitude: 61.370716, longitude: -152.404419 },
    'AZ': { latitude: 33.729759, longitude: -111.431221 },
    'CA': { latitude: 36.116203, longitude: -119.681564 },
    'TX': { latitude: 31.054487, longitude: -97.563461 },
    'NY': { latitude: 42.165726, longitude: -74.948051 },
    'FL': { latitude: 27.766279, longitude: -81.686783 },
    'IL': { latitude: 40.349457, longitude: -88.986137 },
    // ... Add all 50 states
  };

  return stateCentroids[stateCode] || { latitude: 39.8283, longitude: -98.5795 }; // Default: US center
}
```

### 2. Ensure Original Creditor Addresses

**Current Situation:**
- Companies (original creditors) are created with IDs
- Entity-address links exist for companies via `EntityCategory.COMPANY`
- Need to verify original creditors (`debt.originalCreditorId`) have addresses

**Verification Needed:**
```typescript
// In linkContactInfo(), ensure ALL companies get addresses
// Already handled in current implementation (lines 203-206)
```

### 3. Create UI Types

**File:** `libs/dev-utils/src/ui-extended.interfaces.ts` (or create `geographic-analytics.interfaces.ts`)

```typescript
export interface IGeographicStateData {
  stateCode: string;
  stateName: string;
  debtorCount?: number;
  creditorCount?: number;
  totalDebtValue: number;
  averageDebtValue: number;
  activeDebts?: number;
  paidDebts?: number;
  defaultedDebts?: number;
  recoveryRate?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  topCreditors?: Array<{
    id: string;
    name: string;
    debtValue: number;
  }>;
}

export interface IGeographicDebtorAnalytics {
  type: 'debtors';
  totalDebtors: number;
  totalDebtValue: number;
  states: IGeographicStateData[];
}

export interface IGeographicCreditorAnalytics {
  type: 'creditors';
  totalCreditors: number;
  totalDebtValue: number;
  states: IGeographicStateData[];
}

export interface IGeographicFlow {
  originState: string;
  destinationState: string;
  debtValue: number;
  debtCount: number;
}

export interface IGeographicCombinedAnalytics {
  debtors: IGeographicDebtorAnalytics;
  creditors: IGeographicCreditorAnalytics;
  flows: IGeographicFlow[];
}
```

---

## Frontend Implementation

### 1. Update `useCompanyAnalytics` Hook

**File:** `apps/web/src/hooks/useCompanyAnalytics.ts`

**Add new exports:**
```typescript
export interface CompanyAnalyticsData {
  // ... existing fields

  // Geographic analytics
  geographicDebtors: IGeographicDebtorAnalytics;
  geographicCreditors: IGeographicCreditorAnalytics;
  geographicCombined: IGeographicCombinedAnalytics;
}
```

### 2. Create Geographic Calculation Utilities

**File:** `apps/web/src/utils/dashboardMetrics.ts`

**Add functions:**
```typescript
export const calculateGeographicDebtorDistribution = (
  debts: Debt[],
  debtors: Debtor[],
  addresses: Address[],
  entityAddresses: EntityAddress[]
): IGeographicDebtorAnalytics => {
  // Group debts by debtor state
  // Aggregate metrics per state
  // Return structured data
};

export const calculateGeographicCreditorDistribution = (
  debts: Debt[],
  companies: Company[],
  addresses: Address[],
  entityAddresses: EntityAddress[]
): IGeographicCreditorAnalytics => {
  // Group debts by creditor state
  // Aggregate metrics per state
  // Return structured data
};
```

### 3. Add Data Provider Methods

**File:** `apps/web/src/services/api/dataProvider.ts`

**Add methods:**
```typescript
async getGeographicDebtorAnalytics(companyId: string) {
  return this.fetchData(
    /* calculated mock data */,
    `/api/company/${companyId}/analytics/geography/debtors`,
    'geographic debtor analytics'
  );
}

async getGeographicCreditorAnalytics(companyId: string) {
  return this.fetchData(
    /* calculated mock data */,
    `/api/company/${companyId}/analytics/geography/creditors`,
    'geographic creditor analytics'
  );
}

async getGeographicCombinedAnalytics(companyId: string) {
  return this.fetchData(
    /* calculated mock data */,
    `/api/company/${companyId}/analytics/geography/combined`,
    'geographic combined analytics'
  );
}
```

### 4. Add Entity Addresses to Data Store

**File:** `apps/web/src/stores/dataStore.ts`

**Verify entity addresses are being fetched:**
```typescript
// Should already have:
async getEntityAddresses() {
  return this.fetchData(fakerMockData.entityAddresses, '/entity-addresses', 'entity addresses');
}
```

---

## UI Component Design

### Geographic Heat Map Component

**Technology:** `@nivo/geo` (consistent with Sankey implementation)

**Primary Features:**

1. **Interactive US Choropleth Map**
   - Color intensity based on selected metric
   - Smooth gradient color scales (green = positive, red = negative, blue = neutral)
   - Tooltip on hover showing detailed state metrics
   - Click to drill down into state details with modal

2. **View Mode Switcher** (8 distinct views)
   - **Debtor Locations** (default) - Where debtors are located
   - **Original Creditor Locations** - Where debts originated
   - **Payment Plan Engagement** - Active & completed payment plans by state
   - **Responsiveness** - Responsive vs unresponsive debtors
   - **Likelihood to Pay** - Predictive score heat map (green = high likelihood)
   - **Default Risk** - Risk heat map (red = high risk)
   - **Debt Age Distribution** - Aging receivables by region
   - **Combined Flow View** - Animated creditor→debtor state flows

3. **Metric Selector** (context-aware based on view mode)
   - Debtor Locations: Count | Value | Recovery Rate | Active vs Paid
   - Creditor Locations: Count | Value | Top Creditors
   - Payment Plans: Active | Completed | Success Rate
   - Responsiveness: Rate | Contact Attempts
   - Likelihood: Avg Score | High Likelihood Count | Projected Recovery
   - Default Risk: Avg Score | High Risk Count | At-Risk Value
   - Debt Age: Total Value | Avg Age | Age Bucket Distribution

4. **Portfolio Filter Controls**
   - All Portfolios (default)
   - Search by portfolio name (autocomplete)
   - Filter by portfolio type dropdown:
     - Auto Loans
     - Credit Card Debt
     - Medical Collections
     - Student Loans
     - Personal Loans
     - Utility Bills
     - Telecom
   - Combined filters (e.g., "Medical Collections >7 years")

5. **Debt Age Filter**
   - Age bucket selector: 0-30 | 31-60 | 61-90 | 91-180 | 180-365 | 365+ days
   - Custom range slider (optional)
   - Filter applies across all view modes

6. **Legend & Summary Panel**
   - Dynamic color scale explanation based on selected metric
   - Top 5 states by selected metric (sortable table)
   - National totals and averages
   - View-specific KPI cards

**Component Structure:**
```typescript
<Card className="p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
  <Header>
    <Title>Geographic Intelligence</Title>
    <Controls>
      <ModeSelector /> {/* Debtors | Creditors | Combined */}
      <MetricSelector /> {/* Count | Value | Recovery Rate */}
    </Controls>
  </Header>

  <MapContainer height={600}>
    <GeoMap
      data={geographicData}
      mode={selectedMode}
      metric={selectedMetric}
    />
  </MapContainer>

  <InsightsPanel>
    <TopStatesTable />
    <NationalSummary />
  </InsightsPanel>
</Card>
```

---

## Implementation Checklist

### Phase 1: Database Schema Updates ⚠️ (CRITICAL - MUST DO FIRST)
- [ ] **Add `portfolioType` enum and field to `portfolios` table**
  ```sql
  CREATE TYPE portfolio_type AS ENUM (
    'AUTO_LOAN', 'CREDIT_CARD', 'MEDICAL_COLLECTIONS',
    'STUDENT_LOAN', 'PERSONAL_LOAN', 'UTILITY', 'TELECOM'
  );
  ALTER TABLE portfolios ADD COLUMN portfolio_type portfolio_type;
  ```
- [ ] **Add debtor behavior fields to `debts` table**
  ```sql
  ALTER TABLE debts ADD COLUMN has_active_payment_plan BOOLEAN DEFAULT false;
  ALTER TABLE debts ADD COLUMN payment_plan_started_at TIMESTAMP;
  ALTER TABLE debts ADD COLUMN payment_plan_completed_at TIMESTAMP;
  ALTER TABLE debts ADD COLUMN last_contact_date TIMESTAMP;
  ALTER TABLE debts ADD COLUMN contact_attempts INTEGER DEFAULT 0;
  ALTER TABLE debts ADD COLUMN is_responsive BOOLEAN DEFAULT false;
  ALTER TABLE debts ADD COLUMN likelihood_to_pay_score INTEGER CHECK (likelihood_to_pay_score BETWEEN 0 AND 100);
  ALTER TABLE debts ADD COLUMN default_risk_score INTEGER CHECK (default_risk_score BETWEEN 0 AND 100);
  ```
- [ ] **Verify/Create original creditor address links**
  - Ensure all companies used as `originalCreditorId` have entity_addresses records

### Phase 2: Mock Data Generation 🔨 (HIGH PRIORITY)
- [ ] **Update `fakerMockData.ts` - Coordinates**
  - [ ] Add `getStateCoordinates()` helper with all 50 US state centroids
  - [ ] Update `generateContactInfo()` to populate latitude/longitude with variance
  - [ ] Ensure original creditor companies get addresses

- [ ] **Update `fakerMockData.ts` - Portfolio Types**
  - [ ] Add `PortfolioType` enum to shared-types
  - [ ] Assign realistic types to portfolios (e.g., 40% credit card, 25% medical, etc.)
  - [ ] Update `IPortfolioUI` interface with `portfolioType` field

- [ ] **Update `fakerMockData.ts` - Behavioral Data**
  - [ ] Generate `hasActivePaymentPlan` (15-20% of debts)
  - [ ] Generate `paymentPlanCompletedAt` for completed plans
  - [ ] Generate `lastContactDate` and `contactAttempts`
  - [ ] Calculate `isResponsive` based on contact history
  - [ ] Generate realistic `likelihoodToPayScore` (0-100, weighted distribution)
  - [ ] Generate realistic `defaultRiskScore` (0-100, inverse correlation with likelihood)

### Phase 3: TypeScript Interfaces & Types 🔨 (MEDIUM PRIORITY)
- [ ] **Create `geographic-analytics.interfaces.ts`**
  - [ ] `IGeographicStateData`
  - [ ] `IGeographicDebtorAnalytics`
  - [ ] `IGeographicCreditorAnalytics`
  - [ ] `IGeographicPaymentPlanAnalytics`
  - [ ] `IGeographicResponsivenessAnalytics`
  - [ ] `IGeographicLikelihoodAnalytics`
  - [ ] `IGeographicDefaultRiskAnalytics`
  - [ ] `IGeographicDebtAgeAnalytics`
  - [ ] `IGeographicCombinedAnalytics`

- [ ] **Create `PortfolioType` enum in shared-types**
  ```typescript
  export enum PortfolioType {
    AUTO_LOAN = 'AUTO_LOAN',
    CREDIT_CARD = 'CREDIT_CARD',
    MEDICAL_COLLECTIONS = 'MEDICAL_COLLECTIONS',
    STUDENT_LOAN = 'STUDENT_LOAN',
    PERSONAL_LOAN = 'PERSONAL_LOAN',
    UTILITY = 'UTILITY',
    TELECOM = 'TELECOM'
  }
  ```

### Phase 4: Backend Calculation Logic 🔨 (HIGH PRIORITY)
- [ ] **Create `apps/web/src/utils/geographicMetrics.ts`**
  - [ ] `calculateGeographicDebtorDistribution()`
  - [ ] `calculateGeographicCreditorDistribution()`
  - [ ] `calculateGeographicPaymentPlanAnalytics()`
  - [ ] `calculateGeographicResponsiveness()`
  - [ ] `calculateGeographicLikelihoodToPay()`
  - [ ] `calculateGeographicDefaultRisk()`
  - [ ] `calculateGeographicDebtAge()`
  - [ ] `calculateGeographicCombinedAnalytics()`

- [ ] **Update `useCompanyAnalytics` hook**
  - [ ] Add geographic data to return object
  - [ ] Implement filtering logic (portfolio, age, behavior)
  - [ ] Add memoization for performance

- [ ] **Update `dataProvider.ts`**
  - [ ] Add `getGeographicAnalytics()` methods for each endpoint
  - [ ] Implement mock data calculation
  - [ ] Add API endpoint placeholders

### Phase 5: UI Component Development 🎨 (HIGH PRIORITY)
- [ ] **Install dependencies**
  - [ ] `npm install @nivo/geo` (for US choropleth map)
  - [ ] Verify `@nivo/core` compatibility

- [ ] **Create `GeographicHeatMap` component**
  - [ ] Base map component with @nivo/geo
  - [ ] State tooltip with detailed metrics
  - [ ] Color scale based on metric
  - [ ] Click handler for state drill-down

- [ ] **Create `GeographicControls` component**
  - [ ] **View Mode Selector**:
    - Debtor Locations
    - Original Creditor Locations
    - Payment Plan Engagement
    - Responsiveness
    - Likelihood to Pay
    - Default Risk
    - Debt Age Distribution
  - [ ] **Metric Selector** (changes within view):
    - Count vs Value vs Rate metrics
  - [ ] **Portfolio Filter**:
    - Dropdown: All Portfolios | Search by name | Filter by type
  - [ ] **Debt Age Filter**:
    - Slider or buckets: 0-30, 31-60, 61-90, 91-180, 180-365, 365+

- [ ] **Create `GeographicInsightsPanel` component**
  - [ ] Top 5 states table by selected metric
  - [ ] National summary stats
  - [ ] Legend explaining color scale
  - [ ] Export to CSV button

- [ ] **Create `GeographicDrilldownModal` component**
  - [ ] Triggered on state click
  - [ ] Shows detailed state-level metrics
  - [ ] City-level breakdown (if coordinates available)
  - [ ] List of top debtors/creditors in state

- [ ] **Create `SkeletonGeographicMap` loader**
  - [ ] Matches geographic section layout
  - [ ] Shows loading states for map + controls + insights

### Phase 6: Integration & Polish 🎨 (FINAL)
- [ ] **Add to `CompanyAnalyticsPage`**
  - [ ] Position after Sankey diagram section
  - [ ] Gradient card wrapper (blue/indigo/purple theme)
  - [ ] Wire up to `useCompanyAnalytics` data
  - [ ] Add section heading: "Geographic Intelligence"

- [ ] **Advanced Features**
  - [ ] Animated state-to-state flows (creditor → debtor)
  - [ ] Heat map animation when switching views
  - [ ] Real-time indicator when data updates
  - [ ] Export functionality for all geographic data

- [ ] **Testing & Validation**
  - [ ] Test all view modes with mock data
  - [ ] Test all filters work correctly
  - [ ] Verify tooltips show correct data
  - [ ] Test drill-down modals
  - [ ] Validate color scales are meaningful

- [ ] **Documentation Updates**
  - [ ] Add to demo checklist with screenshots
  - [ ] Update API contracts if endpoints change
  - [ ] Create user guide for geographic features

---

## Expected Outcome

**Visual Impact:**
- Large, interactive US map as second major centerpiece (alongside Sankey)
- Gradient color scales showing concentration/performance
- Smooth animations when switching modes/metrics

**Business Value:**
- Identify high-concentration debtor regions for targeted campaigns
- Understand creditor source diversification
- Compare regional recovery performance
- Inform regional expansion decisions

**Technical Quality:**
- Uses real data shapes from shared-types
- Consistent with existing architecture (Sankey pattern)
- Fully typed interfaces
- API-ready with documented endpoints

---

## Summary & Impact Analysis

### Feature Scope
This Geographic Intelligence Platform represents a **major feature addition** that transforms the Company Analytics page into a best-in-class collections management dashboard. The implementation includes:

- **8 distinct heat map views** providing multi-dimensional geographic insights
- **Advanced filtering** by portfolio type, debt age, and behavioral characteristics
- **Predictive analytics** visualization (likelihood to pay, default risk scores)
- **Interactive drill-down** capabilities for state-level detail
- **Export functionality** for geographic data analysis

### Data Requirements Summary

**Critical Schema Changes:**
1. Add 8 new fields to `debts` table for behavioral tracking
2. Add `portfolioType` enum and field to `portfolios` table
3. Ensure all original creditors have address data

**Mock Data Updates:**
1. Generate realistic lat/long coordinates for all addresses
2. Add portfolio type distribution
3. Generate behavioral scores and engagement data
4. Ensure original creditor address linking

### Implementation Effort Estimate

| Phase | Complexity | Effort (Hours) | Dependencies |
|-------|-----------|---------------|--------------|
| Database Schema | Medium | 8-12 | Migration scripts, entity updates |
| Mock Data Generation | High | 16-24 | Schema complete, faker utilities |
| TypeScript Interfaces | Low | 4-6 | Schema complete |
| Calculation Logic | High | 20-30 | Mock data, interfaces |
| UI Components | Very High | 40-60 | @nivo/geo, calculation logic |
| Integration & Polish | Medium | 12-20 | All above complete |
| **TOTAL** | **Very High** | **100-152 hours** | **2-3 week sprint** |

### Technical Risks

1. **@nivo/geo Learning Curve:** Team may not be familiar with geographic visualizations
   - *Mitigation:* Prototype simple map first, reference nivo examples

2. **Performance with Large Datasets:** Geographic calculations may be slow with 1000+ debts
   - *Mitigation:* Implement memoization, consider web workers for calculations

3. **Mock Data Complexity:** Generating realistic behavioral scores is non-trivial
   - *Mitigation:* Use weighted random distributions, document assumptions

4. **Coordinate Accuracy:** State centroids are approximations
   - *Mitigation:* Add small variance to coordinates, use lookup table for precision

### Business Value Justification

**Unique Competitive Advantages:**
- **Geographic targeting:** Identify high-value regions for collection campaigns
- **Risk visualization:** See where default risk is concentrated
- **Source analysis:** Understand which creditors provide better-performing debt
- **Portfolio optimization:** Compare performance by debt type and location
- **Predictive insights:** Visualize likelihood to pay and engagement potential

**Demo Impact:**
- Highly visual, impressive "wow factor" for stakeholders
- Demonstrates sophisticated data analysis capabilities
- Shows platform can support strategic business decisions
- Differentiates from basic collection management tools

---

## Discussion Points & Decisions Needed

### 1. **Portfolio Type Taxonomy**
   - **Question:** Are the 7 proposed types sufficient? (AUTO_LOAN, CREDIT_CARD, MEDICAL_COLLECTIONS, STUDENT_LOAN, PERSONAL_LOAN, UTILITY, TELECOM)
   - **Consider:** Industry-specific types (e.g., "Medical >7 years" as separate type vs filter combination)
   - **Decision Needed:** Finalize portfolio type enum before schema changes

### 2. **Behavioral Score Generation**
   - **Question:** Should scores be purely random or follow business logic rules?
   - **Options:**
     - A) Pure random with weighted distributions (faster, demo-ready)
     - B) Rule-based (e.g., older debt = higher default risk, recent payments = higher likelihood)
     - C) Simple ML model (most realistic, but complex)
   - **Decision Needed:** Choose approach for mock data generation

### 3. **State Centroid Data**
   - **Question:** Hardcode all 50 US states or use external lookup service?
   - **Recommendation:** Hardcode for demo (faster, no API dependency), document for future enhancement
   - **Decision Needed:** Confirm approach

### 4. **View Mode Positioning**
   - **Question:** Should this come before or after the Sankey diagram on CompanyAnalyticsPage?
   - **Recommendation:** After Sankey, as second major visual centerpiece
   - **Consider:** Page flow: Stats → Sankey (debt flows) → Geographic (spatial insights) → Tables
   - **Decision Needed:** Confirm positioning

### 5. **State Drill-Down UX**
   - **Question:** Modal vs navigation for state details?
   - **Options:**
     - A) Modal overlay (keeps context, faster, recommended)
     - B) Navigate to new page (more space, but loses map context)
   - **Decision Needed:** Choose drill-down pattern

### 6. **Flow Visualization Complexity**
   - **Question:** Implement animated state-to-state flows in Phase 6?
   - **Consideration:** This is the most complex visual feature (30-40 hours alone)
   - **Options:**
     - A) Include in initial release (full "wow factor")
     - B) Defer to v2 (ship faster, iterate later)
   - **Decision Needed:** MVP scope vs ideal scope

### 7. **International Address Support**
   - **Question:** Future-proof for international addresses now or later?
   - **Current Scope:** US-only with state centroids
   - **Future Enhancement:** Country-level visualization for international debts
   - **Decision Needed:** Document-only or design hooks now?

### 8. **Performance Optimization Priority**
   - **Question:** How critical is performance with mock data?
   - **Consideration:** Real API will have server-side aggregation, but demo uses client-side calc
   - **Options:**
     - A) Optimize now (web workers, memoization)
     - B) Accept slower performance for demo, optimize when API is ready
   - **Decision Needed:** Performance vs speed to demo

---

## Next Steps

### Immediate Actions (This Week):
1. **Review & Approve:** Team reviews this document and approves scope
2. **Finalize Decisions:** Answer all discussion points above
3. **Schema Planning:** Create migration scripts for database changes
4. **Prototype Map:** Quick prototype with @nivo/geo to validate approach

### Sprint Planning (Next 2-3 Weeks):
1. **Week 1:** Database schema + mock data generation (Phases 1-2)
2. **Week 2:** Calculation logic + UI component scaffolding (Phases 3-4)
3. **Week 3:** UI polish + integration + testing (Phases 5-6)

### Success Criteria:
- [ ] All 8 view modes functional with realistic mock data
- [ ] Portfolio and age filters working correctly
- [ ] Heat map color scales meaningful and visually appealing
- [ ] State drill-down provides valuable detail
- [ ] Performance acceptable (< 2s to switch views)
- [ ] Documented for demo walkthrough

---

**Status:** **V2.0 COMPREHENSIVE PLAN - READY FOR REVIEW & DISCUSSION**
**Priority:** **HIGH - Major differentiator for Company Analytics**
**Effort:** **~100-150 hours (2-3 week sprint)**
**Dependencies:** Schema changes, @nivo/geo package, behavioral data model