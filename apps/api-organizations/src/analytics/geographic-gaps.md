# Creditor Entity & Geographic Analytics Schema Requirements

**Document Version:** 1.0
**Date:** December 5, 2025
**Status:** Pre-MVP - No Backward Compatibility Required
**Priority:** HIGH - Blocks creditor geographic analytics

---

## Executive Summary

To enable **creditor geographic analytics** (where did debts originate), we need to add creditor entities with addresses to the database. Currently, debts only store `original_creditor_name` as a string, which prevents us from:
- Showing which states creditors operate from
- Visualizing debt flows from creditor state → debtor state
- Aggregating debt portfolios by creditor location
- Analyzing creditor performance by region

**Impact:** Without this, the geographic analytics feature is only 50% functional (debtors work, creditors don't).

---

## 1. What We Need

### Schema Changes Required

#### 1.1 New `creditors` Table

```sql
CREATE TABLE creditors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),  -- EIN for US entities

  -- Classification
  creditor_type VARCHAR(50),  -- 'BANK', 'CREDIT_UNION', 'HOSPITAL', 'UTILITY', 'TELECOM', 'RETAIL', 'OTHER'
  industry VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_creditors_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_creditor_name_per_org UNIQUE (organization_id, name)
);

CREATE INDEX idx_creditors_organization_id ON creditors(organization_id);
CREATE INDEX idx_creditors_name ON creditors(name);
```

#### 1.2 New `creditor_profiles` Table (Contact Information)

```sql
CREATE TABLE creditor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creditor_id UUID NOT NULL,

  -- Contact Details
  primary_phone VARCHAR(20),
  secondary_phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Business Hours
  business_hours JSONB,  -- { "monday": "9:00-17:00", ... }
  timezone VARCHAR(50),  -- 'America/New_York'

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_creditor_profiles_creditor FOREIGN KEY (creditor_id) REFERENCES creditors(id) ON DELETE CASCADE,
  CONSTRAINT unique_one_profile_per_creditor UNIQUE (creditor_id)
);

CREATE INDEX idx_creditor_profiles_creditor_id ON creditor_profiles(creditor_id);
```

#### 1.3 New `creditor_addresses` Table

```sql
CREATE TABLE creditor_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creditor_profile_id UUID NOT NULL,

  -- Address Details
  address_type VARCHAR(50) NOT NULL,  -- 'HEADQUARTERS', 'BILLING', 'MAILING', 'BRANCH'
  street1 VARCHAR(255) NOT NULL,
  street2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,  -- StateAbbreviation enum
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) DEFAULT 'US',

  -- Geographic Coordinates (for mapping)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Flags
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Temporal Tracking
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_to TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_creditor_addresses_profile FOREIGN KEY (creditor_profile_id) REFERENCES creditor_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_creditor_addresses_profile_id ON creditor_addresses(creditor_profile_id);
CREATE INDEX idx_creditor_addresses_state ON creditor_addresses(state);
CREATE INDEX idx_creditor_addresses_is_primary ON creditor_addresses(is_primary);
```

#### 1.4 Update `debts` Table

```sql
-- Add foreign key to creditors table
ALTER TABLE debts
  ADD COLUMN original_creditor_id UUID,
  ADD CONSTRAINT fk_debts_original_creditor
    FOREIGN KEY (original_creditor_id)
    REFERENCES creditors(id)
    ON DELETE SET NULL;

CREATE INDEX idx_debts_original_creditor_id ON debts(original_creditor_id);

-- Keep original_creditor_name for denormalization/performance
-- But it becomes secondary to the FK relationship
```

**Migration Notes:**
- `original_creditor_id` is **nullable** to handle:
  1. Existing debts (will be NULL until backfilled)
  2. Debts where creditor is unknown/not in system
- We'll keep `original_creditor_name` for backward compatibility and performance
- During data migration, we'll create creditor records from unique `original_creditor_name` values

---

## 2. Why We Need It

### Business Value

#### Geographic Analytics
- **Creditor Location Heatmap:** See which states originate the most debt
- **Debt Flow Visualization:** Sankey diagrams showing creditor state → debtor state flows
- **Regional Performance:** Compare recovery rates by creditor region
- **Portfolio Diversification:** Analyze geographic concentration of debt sources

#### Operational Benefits
- **Creditor Contact Management:** Centralized creditor contact information
- **Relationship Tracking:** Track all debts from each creditor entity
- **Compliance:** Properly identify creditors for regulatory reporting
- **Communication:** Contact creditors about debt portfolios

#### Data Quality
- **Normalization:** Prevent duplicate creditor names with slight variations
  - "Bank of America" vs "BofA" vs "Bank of America N.A."
- **Historical Tracking:** Track creditor address changes over time
- **Validation:** Ensure creditor information is complete and accurate

---

## 3. How to Implement at Scale

### Entity Design Philosophy

#### Separation of Concerns
1. **`creditors`** - Core entity (who they are)
2. **`creditor_profiles`** - Contact information (how to reach them)
3. **`creditor_addresses`** - Location data (where they are)

This mirrors our debtor entity structure:
- `debtor_profiles` → `creditors`
- `debtor_contact_info` → `creditor_profiles`
- `debtor_addresses` → `creditor_addresses`

#### Scalability Considerations

**Multi-Tenancy:**
- Creditors are scoped to `organization_id`
- Same creditor for different orgs = separate records
- Rationale: Each org may have different contact info for same bank

**Temporal Data:**
- `creditor_addresses.valid_from` / `valid_to` tracks address history
- Enables "where was this creditor when debt was originated?"
- Critical for historical analytics

**Geographic Coordinates:**
- Pre-calculate lat/lng for creditor addresses during creation
- Use geocoding service (Google Maps API, OpenCage, etc.)
- Enables advanced mapping features

**Performance:**
- Keep `debt.original_creditor_name` denormalized for quick queries
- Index on `creditors.name` for autocomplete/search
- Index on `creditor_addresses.state` for geographic aggregation

### Implementation Phases

#### Phase 1: Schema & Entities (1-2 days)

**Database Migration:**
```sql
-- 001_create_creditors_table.sql
-- 002_create_creditor_profiles_table.sql
-- 003_create_creditor_addresses_table.sql
-- 004_alter_debts_add_creditor_fk.sql
```

**TypeORM Entities:**
- `apps/api-debts/src/creditors/entities/creditor.entity.ts`
- `apps/api-debts/src/creditors/entities/creditor-profile.entity.ts`
- `apps/api-debts/src/creditors/entities/creditor-address.entity.ts`

**Relationships:**
```typescript
// Creditor entity
@Entity({ name: 'creditors' })
export class Creditor {
  @OneToOne(() => CreditorProfile, profile => profile.creditor)
  profile: CreditorProfile;

  @OneToMany(() => Debt, debt => debt.originalCreditor)
  debts: Debt[];
}

// Debt entity - update
@ManyToOne(() => Creditor, creditor => creditor.debts)
@JoinColumn({ name: 'original_creditor_id' })
originalCreditor?: Creditor;
```

#### Phase 2: CRUD Operations (2-3 days)

**API Endpoints (api-debts):**
```
POST   /creditors                    # Create creditor
GET    /creditors                    # List creditors (paginated, searchable)
GET    /creditors/:id                # Get creditor details
PATCH  /creditors/:id                # Update creditor
DELETE /creditors/:id                # Soft delete creditor

POST   /creditors/:id/addresses      # Add creditor address
PATCH  /creditors/:id/addresses/:aid # Update address
DELETE /creditors/:id/addresses/:aid # Remove address
```

**Services:**
- `CreditorService` - Business logic for creditor management
- `CreditorProfileService` - Contact information management
- `CreditorAddressService` - Address CRUD with geocoding

**DTOs:**
- `CreateCreditorDto` with nested profile and address
- `UpdateCreditorDto`
- `CreditorResponseDto` with relations

#### Phase 3: Data Migration (1 day)

**Migration Script:**
```typescript
// scripts/migrate-creditors.ts

async function migrateCreditors() {
  // 1. Get unique creditor names from debts table
  const uniqueCreditors = await debtRepo
    .createQueryBuilder('debt')
    .select('DISTINCT debt.original_creditor_name', 'name')
    .addSelect('debt.organization_id', 'orgId')
    .getRawMany();

  // 2. Create creditor entities
  for (const { name, orgId } of uniqueCreditors) {
    const creditor = await creditorRepo.create({
      organizationId: orgId,
      name: name,
      creditorType: inferCreditorType(name), // BANK, HOSPITAL, etc.
    });
    await creditorRepo.save(creditor);

    // 3. Create placeholder profile
    const profile = await profileRepo.create({
      creditorId: creditor.id,
      notes: 'Migrated from original_creditor_name field'
    });
    await profileRepo.save(profile);

    // 4. Create placeholder address (if needed for geographic analytics)
    // Could use creditor name to geocode or set to null initially
    const address = await addressRepo.create({
      creditorProfileId: profile.id,
      addressType: 'HEADQUARTERS',
      street1: 'Unknown',
      city: 'Unknown',
      state: 'CA', // Placeholder - need manual data entry
      postalCode: '00000',
      isPrimary: true,
    });
    await addressRepo.save(address);

    // 5. Update all debts with this creditor name
    await debtRepo.update(
      {
        organizationId: orgId,
        originalCreditorName: name
      },
      {
        originalCreditorId: creditor.id
      }
    );
  }
}
```

**Manual Data Entry:**
- For critical creditors (top 20 by debt volume), manually add real addresses
- Use company website, business records, or geocoding services
- Assign correct creditor types and industry classifications

#### Phase 4: Update Analytics (1 day)

See **Section 4** below for detailed analytics updates.

---

## 4. What to Do After Implementation

### Code Changes Required

#### 4.1 Update Geographic Creditor Analytics Service

**File:** `apps/api-debts/src/internal/analytics/analytics.service.ts`

**Current implementation (lines 764-841):** Replace placeholder logic

**New implementation:**
```typescript
async getGeographicCreditors(
  organizationId: string,
  query: GeographicCreditorsQueryDto,
): Promise<GeographicCreditorsResponseDto> {
  this.logger.log(`[getGeographicCreditors] START for org: ${organizationId}`);

  // Join debts to creditors and creditor addresses
  const queryBuilder = this.debtRepository
    .createQueryBuilder('debt')
    .innerJoin('debt.originalCreditor', 'creditor')
    .innerJoin('creditor.profile', 'profile')
    .innerJoin('profile.addresses', 'addr', 'addr.is_primary = true')
    .select('addr.state', 'stateCode')
    .addSelect('creditor.id', 'creditorId')
    .addSelect('creditor.name', 'creditorName')
    .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalDebtValue')
    .addSelect('COUNT(DISTINCT debt.id)', 'debtCount')
    .where('debt.organization_id = :organizationId', { organizationId })
    .groupBy('addr.state')
    .addGroupBy('creditor.id')
    .addGroupBy('creditor.name')
    .orderBy('"totalDebtValue"', 'DESC');

  // Apply filters
  if (query.states && query.states.length > 0) {
    queryBuilder.andWhere('addr.state IN (:...states)', { states: query.states });
  }

  if (query.portfolioId) {
    queryBuilder.andWhere('debt.portfolio_id = :portfolioId', {
      portfolioId: query.portfolioId,
    });
  }

  if (query.startDate) {
    queryBuilder.andWhere('debt.created_at >= :startDate', {
      startDate: new Date(query.startDate),
    });
  }

  if (query.endDate) {
    queryBuilder.andWhere('debt.created_at <= :endDate', {
      endDate: new Date(query.endDate),
    });
  }

  const rawResults = await queryBuilder.getRawMany();

  this.logger.log(`[getGeographicCreditors] Found ${rawResults.length} creditor-state combinations`);

  // Group by state
  const stateMap = new Map<StateAbbreviation, {
    creditors: Set<string>;
    totalDebtValue: number;
    topCreditors: Map<string, { id: string; name: string; debtValue: number }>;
  }>();

  for (const row of rawResults) {
    const state = row.stateCode as StateAbbreviation;

    if (!stateMap.has(state)) {
      stateMap.set(state, {
        creditors: new Set(),
        totalDebtValue: 0,
        topCreditors: new Map(),
      });
    }

    const stateData = stateMap.get(state)!;
    stateData.creditors.add(row.creditorId);
    stateData.totalDebtValue += parseFloat(row.totalDebtValue || '0');

    // Track top creditors
    stateData.topCreditors.set(row.creditorId, {
      id: row.creditorId,
      name: row.creditorName,
      debtValue: parseFloat(row.totalDebtValue || '0'),
    });
  }

  // Build response
  const states: StateCreditorMetricsDto[] = Array.from(stateMap.entries())
    .map(([stateCode, data]) => {
      // Get top 3 creditors by debt value
      const topCreditors = Array.from(data.topCreditors.values())
        .sort((a, b) => b.debtValue - a.debtValue)
        .slice(0, 3);

      return {
        stateCode,
        creditorCount: data.creditors.size,
        totalDebtValue: data.totalDebtValue,
        averageDebtValue: data.totalDebtValue / data.creditors.size,
        topCreditors,
      };
    })
    .sort((a, b) => b.totalDebtValue - a.totalDebtValue);

  const totalCreditors = new Set(
    rawResults.map(r => r.creditorId)
  ).size;

  const totalDebtValue = states.reduce((sum, s) => sum + s.totalDebtValue, 0);

  this.logger.log(
    `[getGeographicCreditors] Returning ${states.length} states, ${totalCreditors} unique creditors, total debt value: ${totalDebtValue}`
  );

  return {
    totalCreditors,
    totalDebtValue,
    states,
  };
}
```

#### 4.2 Update Geographic Combined Orchestrator

**File:** `packages/event-orchestrator/src/orchestrators/analytics-geographic-combined.orchestrator.ts`

**Current implementation (lines 139-236):** Already functional, but update flow calculation

**Updated flow computation:**
```typescript
private computeGeographicFlows(
  debtorAnalytics: IGeographicDebtorAnalytics,
  creditorAnalytics: IGeographicCreditorAnalytics,
): IGeographicFlow[] {
  const flows: IGeographicFlow[] = [];

  // Now that we have real creditor state data, this will work properly
  for (const creditorState of creditorAnalytics.states) {
    for (const debtorState of debtorAnalytics.states) {
      // Skip same-state flows for cleaner visualization
      if (creditorState.stateCode === debtorState.stateCode) continue;

      // Calculate flow value based on overlap
      // Assumption: debt flows proportionally from creditor states to debtor states
      const creditorProportion =
        creditorState.totalDebtValue / creditorAnalytics.totalDebtValue;
      const debtorProportion =
        debtorState.totalDebtValue / debtorAnalytics.totalDebtValue;

      const flowValue =
        creditorState.totalDebtValue *
        (debtorState.debtorCount / debtorAnalytics.totalDebtors);

      // Only include significant flows (> 0.1% of total debt value)
      if (flowValue / creditorAnalytics.totalDebtValue > 0.001) {
        flows.push({
          originState: creditorState.stateCode,
          destinationState: debtorState.stateCode,
          debtCount: Math.round(
            creditorState.creditorCount *
            (debtorState.debtorCount / debtorAnalytics.totalDebtors)
          ),
          debtValue: flowValue,
        });
      }
    }
  }

  // Sort by debt value and take top 100 flows
  return flows
    .sort((a, b) => b.debtValue - a.debtValue)
    .slice(0, 100);
}
```

#### 4.3 Add Creditor Management UI (Optional but Recommended)

**New pages/components:**
- `apps/web/src/pages/CreditorListPage.tsx` - Browse/search creditors
- `apps/web/src/pages/CreditorDetailPage.tsx` - View/edit creditor
- `apps/web/src/components/CreditorForm.tsx` - Create/edit form
- `apps/web/src/components/CreditorAddressForm.tsx` - Manage addresses

**Integration with debt creation:**
- When creating a debt, autocomplete creditor name from creditors table
- Auto-populate `original_creditor_id` when creditor is selected
- Allow creating new creditor on-the-fly if not in system

#### 4.4 Update Debt Import Process

**File:** `apps/api-debts/src/debts/debts.service.ts` (or import service)

When importing debts from CSV/file:
```typescript
async importDebts(file: File) {
  for (const row of csvRows) {
    // 1. Try to find existing creditor by name
    let creditor = await this.creditorService.findByName(
      organizationId,
      row.original_creditor_name
    );

    // 2. If not found, create new creditor entity
    if (!creditor) {
      creditor = await this.creditorService.create({
        organizationId,
        name: row.original_creditor_name,
        creditorType: 'OTHER', // Default
      });
    }

    // 3. Create debt with creditor FK
    await this.debtRepo.create({
      ...row,
      originalCreditorId: creditor.id,
      originalCreditorName: creditor.name, // Denormalized
    });
  }
}
```

---

## 5. Testing & Validation

### Data Quality Checks

After implementation, verify:

1. **FK Integrity:**
   ```sql
   -- All debts should have creditor FK populated
   SELECT COUNT(*)
   FROM debts
   WHERE original_creditor_id IS NULL
     AND original_creditor_name IS NOT NULL;
   -- Should be 0
   ```

2. **Address Coverage:**
   ```sql
   -- All creditors should have at least one address
   SELECT c.id, c.name
   FROM creditors c
   LEFT JOIN creditor_profiles p ON p.creditor_id = c.id
   LEFT JOIN creditor_addresses a ON a.creditor_profile_id = p.id
   WHERE a.id IS NULL;
   -- Should be empty
   ```

3. **Primary Address:**
   ```sql
   -- Each creditor should have exactly one primary address
   SELECT cp.creditor_id, COUNT(*)
   FROM creditor_addresses ca
   JOIN creditor_profiles cp ON cp.id = ca.creditor_profile_id
   WHERE ca.is_primary = true
   GROUP BY cp.creditor_id
   HAVING COUNT(*) != 1;
   -- Should be empty
   ```

### Analytics Validation

1. **State Totals Match:**
   ```sql
   -- Sum of state-level debt values should equal total
   -- Run geographic creditor endpoint and verify totals
   ```

2. **Flow Accuracy:**
   - Check that flows only connect states with actual creditor-debtor relationships
   - Verify flow values are reasonable percentages of total debt

3. **Performance:**
   - Geographic creditor query should complete in < 2 seconds
   - Test with 10k+ debts, 100+ creditors

---

## 6. Summary & Rollout Plan

### Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| **Schema Design** | 0.5 days | Review this document, finalize schema |
| **Migration Scripts** | 1 day | Write SQL migrations, test locally |
| **Entity Creation** | 1 day | TypeORM entities, relations |
| **CRUD APIs** | 2 days | Creditor management endpoints |
| **Data Migration** | 1 day | Backfill creditors from debts table |
| **Analytics Update** | 1 day | Update geographic creditor service |
| **Testing** | 1 day | Data validation, analytics verification |
| **Documentation** | 0.5 days | API docs, user guides |
| **TOTAL** | **8 days** | ~1.5-2 weeks with buffer |

### Rollout Steps

1. ✅ **Review & Approve** - Team reviews this document
2. ✅ **Create Entities** - Build creditor, profile, address entities
3. ✅ **Write Migrations** - SQL scripts for schema changes
4. ✅ **Run Migrations** - Apply to dev/test databases
5. ✅ **Build CRUD APIs** - Creditor management endpoints
6. ✅ **Backfill Data** - Migrate existing creditor names
7. ✅ **Update Analytics** - Implement geographic creditor aggregation
8. ✅ **Test End-to-End** - Verify analytics display correct data
9. ✅ **Deploy** - Push to production (fresh DB, no migration needed)
10. ✅ **Enable UI** - Activate creditor geographic analytics features

### Success Criteria

- ✅ All creditors have addresses with valid state codes
- ✅ Geographic creditor analytics return state-level data
- ✅ Creditor → debtor flow visualization works correctly
- ✅ Creditor management UI allows editing addresses
- ✅ Debt import auto-creates/links creditors
- ✅ Analytics queries perform in < 2 seconds

---

## 7. Additional Considerations

### Future Enhancements

**Creditor Ratings & Risk:**
- Add `risk_score` to creditors table
- Track creditor default rates
- Flag high-risk creditor relationships

**Creditor Hierarchy:**
- Support parent-subsidiary relationships
- Roll up analytics to parent company level
- Example: "Bank of America" → "BofA California", "BofA Texas"

**Multi-State Creditors:**
- Allow multiple addresses per creditor (branches)
- Show which branch originated which debts
- Aggregate by creditor HQ state vs branch state

**Geocoding Automation:**
- Integrate with Google Maps Geocoding API
- Auto-populate lat/lng when address is entered
- Validate addresses against USPS database

### Schema Flexibility

The proposed schema is extensible:
- Easy to add fields without breaking changes
- Temporal tracking ready for historical queries
- Multiple addresses support future branch tracking
- Profile separation allows adding custom fields

---

## Conclusion

**Current Status:**
- ✅ Debtor geographic analytics: **Fully functional**
- ⚠️ Creditor geographic analytics: **Schema-blocked**
- ⚠️ Combined flow analytics: **Limited without creditor states**

**After Implementation:**
- ✅ Complete creditor entity management
- ✅ Full geographic analytics across all dimensions
- ✅ Creditor-debtor flow visualization
- ✅ Scalable foundation for advanced creditor features

**Recommendation:**
Implement creditor entities **before** UI development for geographic analytics. This ensures the UI can be built once with full functionality rather than releasing with limited features and updating later.

**Estimated Effort:** 8-10 days (~2 weeks)
**Business Value:** Unlocks complete geographic intelligence platform
