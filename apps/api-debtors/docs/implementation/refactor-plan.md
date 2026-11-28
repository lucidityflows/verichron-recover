# DebtorIdentity Refactor - Implementation Plan

## Objective

Implement the DebtorIdentity vs DebtorProfile separation to enable proper multi-tenancy for debtors.

## Overview

**Current State:** Single `Debtor` entity with conflicting constraints
**Target State:** Two-entity model with clear separation of identity and org-scoped profiles

## Architecture

### DebtorIdentity (Global Identity)
```
Table: debtor_identities
- id (PK, UUID) - The global debtorId
- user_id (FK to users, nullable, UNIQUE)
- created_at
- updated_at
```

**Purpose:** Represents a unique real-world person across all organizations.

### DebtorProfile (Organization-Scoped Profile)
```
Table: debtor_profiles (renamed from debtors)
- id (PK, UUID) - The debtorProfileId
- debtor_identity_id (FK to debtor_identities, NOT NULL)
- organization_id (FK, NOT NULL)
- first_name
- last_name
- middle_name
- date_of_birth
- verification_status
- created_at
- updated_at
- UNIQUE(debtor_identity_id, organization_id)
```

**Purpose:** Represents a person's data within a specific organization.

### Contact Information (Org-Scoped)
```
Tables: debtor_emails, debtor_addresses, debtor_phones
- Change FK from debtor_id to debtor_profile_id
- Contact info belongs to the org-specific profile, not global identity
```

### Demographics (Org-Scoped)
```
Table: debtor_demographics
- Change FK from debtor_id to debtor_profile_id
- Demographics are org-specific (different orgs may have different data)
```

## Implementation Steps

### Phase 1: Database Schema Changes

#### 1.1 Create DebtorIdentity Entity
- [ ] Create `debtor-identity.entity.ts`
- [ ] Add to entities index
- [ ] Create TypeORM migration

#### 1.2 Create Migration Script
- [ ] Create migration to:
  - Create `debtor_identities` table
  - Rename `debtors` to `debtor_profiles`
  - Add `debtor_identity_id` column to `debtor_profiles`
  - Migrate existing data (1 identity per existing debtor)
  - Drop old `user_id` unique constraint from `debtor_profiles`
  - Add composite unique constraint on `(debtor_identity_id, organization_id)`
  - Update FKs in contact tables (emails, addresses, phones)
  - Update FKs in demographics table
  - Update FKs in debtor_documents table

#### 1.3 Update Debt-Debtor Relationship
- [ ] Update `debt_debtor` join table to reference `debtor_profile_id`
- [ ] Keep the relationship at profile level (debts are org-specific)

### Phase 2: Entity & Service Layer Changes

#### 2.1 Update Entities
- [ ] Create `DebtorIdentity` entity
- [ ] Rename `Debtor` entity to `DebtorProfile`
- [ ] Update relationships in `DebtorProfile`
- [ ] Update all contact entities (Address, Email, Phone) to reference `DebtorProfile`
- [ ] Update `DebtorDemographics` to reference `DebtorProfile`
- [ ] Update `DebtorDocument` to reference `DebtorProfile`

#### 2.2 Update Services
- [ ] Create `DebtorIdentityService`
  - `findOrCreateIdentity(userId?: string): Promise<DebtorIdentity>`
  - `linkUserToIdentity(identityId: string, userId: string)`
  - `findIdentityByUser(userId: string)`
- [ ] Refactor `ProfilesService` to work with `DebtorProfile`
  - Update all methods to use profile model
  - Add identity creation/lookup logic
  - Ensure org-scoping is correct

#### 2.3 Update Controllers
- [ ] Review `ProfilesController` for breaking changes
- [ ] Update DTOs if needed
- [ ] Ensure API contract remains stable where possible

### Phase 3: Event Handling

#### 3.1 Update Event Publishers
- [ ] `DebtorCreated` - Include both identityId and profileId
- [ ] `DebtorUserLinked` - Update to reference identity
- [ ] `DebtorProfileCreated` - New event for profile creation

#### 3.2 Update Event Listeners
- [ ] `UserRegistered` handler - Link to identity, not profile
- [ ] Update any listeners in api-debts that query debtor data

### Phase 4: api-debts Integration

#### 4.1 Update Debt Import Processor
- [ ] Modify import logic to:
  1. Create or find `DebtorIdentity` (by matching criteria)
  2. Create or find `DebtorProfile` for the organization
  3. Associate debt with the profile

#### 4.2 Update Debt-Debtor Relationship
- [ ] Update queries in `DebtsService` to join through profiles
- [ ] Ensure debt queries respect org boundaries

### Phase 5: Redis Read Model

#### 5.1 Update Read Model Structure
- [ ] Update Redis keys to include profile concept
- [ ] User debtor lookups should traverse: User → Identity → Profiles[]

#### 5.2 Update Event Listeners
- [ ] Fix `DebtorUserLinked` listener to update correct Redis keys
- [ ] Ensure user can find all their profiles across orgs

### Phase 6: E2E Testing

#### 6.1 Update Seeding
- [ ] Update `e2e/seeding/test-data/debtors.seed.ts`:
  - Create identity first
  - Create profile per organization
  - Link to identity

#### 6.2 Update Factories
- [ ] Update `e2e/fixtures/api-debtors/factories/debtorFactory.ts`
- [ ] Create `debtorIdentityFactory.ts`
- [ ] Ensure factories can create multi-org scenarios

#### 6.3 Update Tests
- [ ] Review E2E journey tests for breaking changes
- [ ] Add multi-org debtor test scenarios

### Phase 7: Documentation

- [ ] Update `api-debtors/README.md`
- [ ] Update entity documentation
- [ ] Create architecture diagram
- [ ] Document migration process

## Data Migration Strategy

### Backward Compatibility During Transition

**Option 1: Clean Break (Recommended for Alpha)**
- Run migration during setup
- No backward compatibility needed
- Simpler implementation

**Option 2: Gradual Migration**
- Support both models temporarily
- Migrate data in background
- More complex, but safer for production

**Recommendation:** Option 1 - We're in alpha, use clean break.

### Migration Logic

```typescript
// For each existing debtor:
1. Create DebtorIdentity
   - If debtor has user_id → use it in identity
   - Generate new identity ID

2. Create DebtorProfile (from existing debtor data)
   - Link to new identity
   - Keep organization_id
   - Migrate all fields

3. Update Contact Info
   - Update FKs to point to profile

4. Update Demographics
   - Update FK to point to profile

5. Update Debt Associations
   - Update debt_debtor join table
```

## API Contract Changes

### Breaking Changes
- `POST /debtors` response now includes `debtorIdentityId`
- Internal IDs changed (but external APIs mostly unchanged)

### Non-Breaking Changes
- Most REST endpoints remain the same
- `/debtors/{id}` still works (id = profileId)
- Events have additional fields but maintain backward compatibility

## Testing Checklist

- [ ] Unit tests for DebtorIdentityService
- [ ] Unit tests for updated ProfilesService
- [ ] Integration test for user linking
- [ ] E2E test for single-org debtor
- [ ] E2E test for multi-org debtor (Diana Prince scenario)
- [ ] E2E test for debt import creating profiles
- [ ] Verify Redis read model works
- [ ] Verify event publishing works
- [ ] Verify user can view debts across orgs

## Rollback Plan

If critical issues arise:
1. Keep old schema as backup
2. Migration can be reversed
3. Restore from backup if needed

**For Alpha:** Low risk - we control all data.

## Timeline Estimate

- Phase 1 (Schema): 1-2 hours
- Phase 2 (Entities/Services): 2-3 hours
- Phase 3 (Events): 1 hour
- Phase 4 (api-debts): 1 hour
- Phase 5 (Redis): 1 hour
- Phase 6 (E2E): 1-2 hours
- Phase 7 (Docs): 30 mins

**Total: 8-12 hours** (can be done in 1-2 days)

## Success Criteria

- [ ] Diana Prince can be a debtor in both Stark and Wayne
- [ ] Diana Prince has ONE user account linked to ONE identity
- [ ] Diana Prince has TWO separate profiles (one per org)
- [ ] Contact info is org-scoped (can be different per org)
- [ ] Debts associate with correct profile
- [ ] User can view all their debts across all orgs
- [ ] E2E seeding completes successfully
- [ ] All tests pass

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feature/debtor-identity-refactor`
3. Start with Phase 1 (schema changes)
4. Implement incrementally, testing at each phase
5. Update E2E seeding to verify multi-org scenarios work
