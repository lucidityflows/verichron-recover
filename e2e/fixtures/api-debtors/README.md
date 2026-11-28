# api-debtors Fixtures

Complete fixture suite for testing the api-debtors microservice. Provides factories for creating individual entities and seed scenarios for common test patterns.

## Architecture

```
api-debtors/
├── factories/                     # Single-entity creation
│   ├── debtorFactory.ts
│   ├── debtorOrganizationAccessFactory.ts
│   └── debtorContactFactory.ts
├── seed/                          # Complete test scenarios
│   ├── debtor-multi-org-access.seed.ts
│   └── complete-debtor-profile.seed.ts
└── events/                        # (Future: Event-driven scenarios)
```

## Quick Start

```typescript
import {
  createDebtorFactory,
  createDebtorContactFactory,
  createDebtorOrganizationAccessFactory,
  seedCompleteDebtorProfile,
  seedDebtorMultiOrgAccess
} from './fixtures/api-debtors';

// Create individual entities
const debtorFactory = createDebtorFactory(debtorsDataSource);
const debtor = await debtorFactory.createVerifiedDebtor({
  firstName: 'John',
  lastName: 'Doe',
  userId: user.id,
});

// Use pre-built scenarios
const scenario = await seedCompleteDebtorProfile(debtorsDataSource, {
  userId: user.id,
  organizationId: org.id,
});
```

## Factories

### DebtorFactory

Creates debtor profile entities with various verification statuses.

```typescript
const debtorFactory = createDebtorFactory(dataSource);

// Create verified debtor (most common)
const debtor = await debtorFactory.createVerifiedDebtor({
  firstName: 'Jane',
  lastName: 'Smith',
  userId: user.id,
  dateOfBirth: new Date('1985-06-15'),
});

// Create debtor with custom options
const debtor = await debtorFactory.createDebtor({
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  userId: user.id,
  verificationStatus: 'PENDING',
  notes: 'Test debtor for e2e testing',
});

// Create unverified debtor
const debtor = await debtorFactory.createUnverifiedDebtor();

// Create multiple debtors
const debtors = await debtorFactory.createMultipleDebtors(5, {
  verificationStatus: 'VERIFIED',
});
```

**Available Methods:**
- `createDebtor(options)` - General debtor creation
- `createDebtorWithUser(userId, options)` - Debtor linked to user account
- `createVerifiedDebtor(options)` - Verified debtor (ready to use)
- `createUnverifiedDebtor(options)` - Unverified debtor
- `createPendingVerificationDebtor(options)` - Debtor with pending verification
- `createMultipleDebtors(count, options)` - Bulk creation

### DebtorOrganizationAccessFactory

Manages which organizations have access to which debtor profiles (multi-tenant architecture).

```typescript
const accessFactory = createDebtorOrganizationAccessFactory(dataSource);

// Grant organization access to debtor
const access = await accessFactory.grantAccess({
  debtorId: debtor.id,
  organizationId: org.id,
  accessLevel: 'FULL',
});

// Grant access from portfolio import scenario
const access = await accessFactory.grantAccessFromPortfolioImport({
  debtorId: debtor.id,
  organizationId: org.id,
  portfolioId: portfolio.id,
});

// Grant multiple organizations access
const accessRecords = await accessFactory.grantMultiOrgAccess({
  debtorId: debtor.id,
  organizationIds: [orgA.id, orgB.id, orgC.id],
  accessLevel: 'FULL',
});

// Revoke access
await accessFactory.revokeAccess({
  accessId: access.id,
  revokedBy: admin.id,
  revocationReason: 'Portfolio sold',
});

// Get all active access for a debtor
const activeAccess = await accessFactory.getActiveAccessForDebtor(debtor.id);
```

**Available Methods:**
- `grantAccess(options)` - Grant organization access
- `grantAccessFromPortfolioImport(options)` - Access from portfolio import
- `grantMultiOrgAccess(options)` - Grant multiple orgs access
- `revokeAccess(options)` - Revoke organization access
- `getActiveAccessForDebtor(debtorId)` - Get all active access
- `getDebtorsForOrganization(orgId)` - Get all debtors for org

### DebtorContactFactory

Creates contact information (phones, emails, addresses) for debtors.

```typescript
const contactFactory = createDebtorContactFactory(dataSource);

// Create primary mobile phone
const phone = await contactFactory.createPrimaryMobilePhone(
  debtor.id,
  '+1-555-123-4567'
);

// Create custom phone
const phone = await contactFactory.createPhone({
  debtorId: debtor.id,
  phoneNumber: '+1-555-987-6543',
  phoneType: 'HOME',
  isPrimary: false,
  isVerified: true,
  canReceiveSms: false,
});

// Create primary email
const email = await contactFactory.createPrimaryEmail(
  debtor.id,
  'john.doe@example.com'
);

// Create custom email
const email = await contactFactory.createEmail({
  debtorId: debtor.id,
  emailAddress: 'work@example.com',
  emailType: 'WORK',
  isPrimary: false,
  isVerified: false,
});

// Create primary home address
const address = await contactFactory.createPrimaryHomeAddress(debtor.id);

// Create custom address
const address = await contactFactory.createAddress({
  debtorId: debtor.id,
  addressLine1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  addressType: 'HOME',
  isPrimary: true,
});

// Create complete contact profile (phone + email + address)
const profile = await contactFactory.createCompleteContactProfile(debtor.id);
```

**Available Methods:**

**Phone Methods:**
- `createPhone(options)` - Create phone number
- `createPrimaryMobilePhone(debtorId, phoneNumber?)` - Primary mobile

**Email Methods:**
- `createEmail(options)` - Create email address
- `createPrimaryEmail(debtorId, emailAddress?)` - Primary email

**Address Methods:**
- `createAddress(options)` - Create address
- `createPrimaryHomeAddress(debtorId)` - Primary home address

**Combined:**
- `createCompleteContactProfile(debtorId)` - Create phone + email + address

## Seed Scenarios

Pre-built scenarios for common testing patterns. These combine factories to create complete, reusable test setups.

### seedDebtorMultiOrgAccess

**Purpose**: Test debtor access to multiple organizations

**Scenario**:
- 1 debtor profile
- Access granted by multiple organizations (configurable)
- All access is active and set to FULL permissions

```typescript
const scenario = await seedDebtorMultiOrgAccess(debtorsDataSource, {
  userId: debtorUser.id,
  organizationIds: [orgA.id, orgB.id, orgC.id],
  firstName: 'John',
  lastName: 'Doe',
  verificationStatus: 'VERIFIED',
});

// Access scenario data
expect(scenario.debtor.userId).toBe(debtorUser.id);
expect(scenario.accessRecords.length).toBe(3);
expect(scenario.organizationIds).toEqual([orgA.id, orgB.id, orgC.id]);

// Use in API test
const response = await apiClient.get('/debtors/profile', debtorToken);
expect(response.body.organizationIds).toHaveLength(3);
```

**Returns**:
```typescript
{
  debtor: Debtor;
  accessRecords: DebtorOrganizationAccess[];
  organizationIds: string[];
}
```

### seedCompleteDebtorProfile

**Purpose**: Create fully populated debtor profile with all contact information

**Scenario**:
- 1 verified debtor profile
- Primary phone (mobile, verified)
- Primary email (verified)
- Primary home address (verified)
- Organization access granted

```typescript
const scenario = await seedCompleteDebtorProfile(debtorsDataSource, {
  userId: debtorUser.id,
  organizationId: org.id,
  firstName: 'Jane',
  lastName: 'Smith',
  phoneNumber: '+1-555-123-4567',
  emailAddress: 'jane.smith@example.com',
});

// Access scenario data
expect(scenario.debtor.verificationStatus).toBe('VERIFIED');
expect(scenario.phone.isPrimary).toBe(true);
expect(scenario.phone.isVerified).toBe(true);
expect(scenario.email.isPrimary).toBe(true);
expect(scenario.email.isVerified).toBe(true);
expect(scenario.address.addressType).toBe('HOME');
expect(scenario.organizationAccess.organizationId).toBe(org.id);
```

**Returns**:
```typescript
{
  debtor: Debtor;
  phone: DebtorPhone;
  email: DebtorEmail;
  address: DebtorAddress;
  organizationAccess: DebtorOrganizationAccess;
}
```

## Common Testing Patterns

### Pattern 1: Multi-Organization Debtor Access

```typescript
describe('Debtor Multi-Org Access', () => {
  let scenario: DebtorMultiOrgAccessScenario;
  let debtorToken: string;

  beforeEach(async () => {
    const debtorUser = await createDebtorUser(/* ... */);
    debtorToken = await getDebtorToken(debtorUser);

    scenario = await seedDebtorMultiOrgAccess(debtorsDataSource, {
      userId: debtorUser.id,
      organizationIds: [orgA.id, orgB.id, orgC.id],
    });
  });

  it('should have access to all organizations', async () => {
    expect(scenario.accessRecords.length).toBe(3);
    expect(scenario.accessRecords.every(a => a.isActive)).toBe(true);
  });
});
```

### Pattern 2: Complete Debtor Profile Testing

```typescript
describe('Debtor Profile Management', () => {
  let scenario: CompleteDebtorProfileScenario;

  beforeEach(async () => {
    scenario = await seedCompleteDebtorProfile(debtorsDataSource, {
      userId: debtorUser.id,
      organizationId: org.id,
    });
  });

  it('should have complete verified contact information', async () => {
    expect(scenario.debtor.verificationStatus).toBe('VERIFIED');
    expect(scenario.phone.isVerified).toBe(true);
    expect(scenario.email.isVerified).toBe(true);
    expect(scenario.address.isVerified).toBe(true);
  });
});
```

### Pattern 3: Custom Debtor Scenarios

```typescript
describe('Custom Debtor Testing', () => {
  it('should create debtor with specific verification status', async () => {
    const debtorFactory = createDebtorFactory(debtorsDataSource);
    const contactFactory = createDebtorContactFactory(debtorsDataSource);

    // Create unverified debtor
    const debtor = await debtorFactory.createUnverifiedDebtor({
      firstName: 'Test',
      lastName: 'User',
    });

    // Add unverified contact info
    await contactFactory.createPhone({
      debtorId: debtor.id,
      phoneType: 'MOBILE',
      isVerified: false,
    });

    // Test verification workflow
    await testVerificationWorkflow(debtor.id);
  });
});
```

## Data Sources

All fixtures require a TypeORM DataSource connection to the api-debtors database:

```typescript
import { getDebtorsDataSource } from '../utils/dbConnections';

const debtorsDataSource = await getDebtorsDataSource();

// Use factories
const debtorFactory = createDebtorFactory(debtorsDataSource);
const contactFactory = createDebtorContactFactory(debtorsDataSource);
const accessFactory = createDebtorOrganizationAccessFactory(debtorsDataSource);

// Use seeds
const scenario = await seedCompleteDebtorProfile(debtorsDataSource, /* ... */);
```

## Entity Relationships

```
Debtor
  ├── id (uuid)
  ├── firstName (string)
  ├── lastName (string)
  ├── userId (uuid) -> User (from api-users)
  ├── verificationStatus (enum: UNVERIFIED, PENDING, VERIFIED, FAILED)
  └── relationships:
      ├── addresses[] -> DebtorAddress
      ├── emails[] -> DebtorEmail
      ├── phones[] -> DebtorPhone
      └── organizationAccess[] -> DebtorOrganizationAccess

DebtorOrganizationAccess (Join Table)
  ├── id (uuid)
  ├── debtorId (uuid) -> Debtor
  ├── organizationId (uuid) -> Organization
  ├── accessLevel (enum: FULL, READ_ONLY, LIMITED)
  ├── isActive (boolean)
  └── accessSource (enum: PORTFOLIO_IMPORT, DEBT_TRANSFER, MANUAL_GRANT)

DebtorPhone
  ├── id (uuid)
  ├── debtorId (uuid) -> Debtor
  ├── phoneNumber (string)
  ├── phoneType (enum: MOBILE, HOME, WORK, FAX, OTHER)
  ├── isPrimary (boolean)
  └── isVerified (boolean)

DebtorEmail
  ├── id (uuid)
  ├── debtorId (uuid) -> Debtor
  ├── emailAddress (string)
  ├── emailType (enum: PERSONAL, WORK, OTHER)
  ├── isPrimary (boolean)
  └── isVerified (boolean)

DebtorAddress
  ├── id (uuid)
  ├── debtorId (uuid) -> Debtor
  ├── addressLine1 (string)
  ├── city, state, postalCode (string)
  ├── addressType (enum: HOME, WORK, BILLING, MAILING, OTHER)
  ├── isPrimary (boolean)
  └── isVerified (boolean)
```

## Best Practices

1. **Use Seed Scenarios for E2E Tests**: Prefer `seedCompleteDebtorProfile()` over manual factory calls for complete test setups

2. **Use Factories for Unit/Integration Tests**: Use `createDebtorFactory()` when testing specific edge cases or single entities

3. **Always Clean Up**: Use `beforeEach`/`afterEach` hooks to reset database state between tests

4. **Leverage TypeScript Types**: Import return types for better IDE autocomplete:
   ```typescript
   import type { CompleteDebtorProfileScenario } from './fixtures/api-debtors';
   ```

5. **Test Data Isolation**: Each test should create its own data using factories/seeds rather than sharing data

6. **Realistic Data**: Factories use Faker.js for realistic test data generation

## Future Enhancements

- **events/**: Event-driven scenarios (debtor registration events, verification events)
- **More seed scenarios**: Verification workflows, multi-debtor family scenarios
- **Bulk operations**: High-volume debtor creation for performance testing
- **Demographics**: Support for debtor demographics entity
