# E2E Seeding

Centralized seeding for E2E testing and UI development.

## Structure

```
e2e/seeding/
├── system/           # Platform configuration (needed in all environments)
│   ├── permissions.seed.ts
│   └── platform-role.seed.ts
├── core/             # Required setup (per-organization)
│   ├── platform-admin-user.seed.ts
│   └── org-roles.seed.ts
├── test-data/        # Test users, orgs, debtors
│   ├── organizations.seed.ts
│   ├── org-users.seed.ts
│   └── debtors.seed.ts
└── index.ts          # Main orchestrator
```

## Usage

### Full UI Development Setup

```bash
pnpm e2e setup     # Infrastructure + system config
pnpm e2e ui-setup  # Run all seeding (calls e2e/seeding/index.ts)
pnpm e2e db:verify # Verify seeding succeeded
```

### In Code

```typescript
import { runUiDevSeed } from './e2e/seeding';

await runUiDevSeed(); // Seeds everything
```

## Seeding Layers

### 1. System Configuration (`system/`)

**What:** Core platform configuration
**When:** Always (test and production)
**Examples:** Permissions, platform admin role

These define the RBAC system structure. They're configuration, not test data.

### 2. Core Setup (`core/`)

**What:** Required per-organization setup
**When:** Always (test and production)
**Examples:** Organization roles, first admin user

These are instantiated for each organization. The templates come from `apps/api-users/src/rbac/`, but seeding happens here.

### 3. Test Data (`test-data/`)

**What:** Realistic test data for development
**When:** Test/development only
**Examples:** Test organizations, users, debtors

These are the "personas" you login as during development.

## Philosophy

### Role Templates (API) vs Seeding (E2E)

**Role Templates** live in `apps/api-users/src/rbac/`:
- Define WHAT roles exist
- Define WHAT permissions each role has
- Are TypeScript constants (configuration as code)
- Are imported by both production and test code

**Seeding** lives in `e2e/seeding/`:
- Creates instances of roles for specific organizations
- Creates test users with realistic data
- Uses the role templates from the API
- Runs during test setup

### Why This Separation?

- **DRY:** Role definitions are not duplicated
- **Type Safety:** Seeding uses the same types as the API
- **Production Ready:** Role templates can be used in prod onboarding
- **Test Flexibility:** Seeding can create complex test scenarios

## Test Users

All test users have password: `Password123!`

### Platform
- `platform.admin@verichron.com` - Platform Administrator

### Stark Industries
- `tony.stark@stark.com` - Org Admin
- `happy.hogan@stark.com` - Manager
- `natasha.romanoff@stark.com` - Collector
- `pepper.potts@stark.com` - User

### Wayne Enterprises
- `bruce.wayne@wayne.com` - Org Admin

### Multi-Org
- `peter.parker@verichron.com` - User in Stark, Admin in Wayne

### Debtors
- `steve.rogers@verichron.com` - Single org, 1 debt
- `diana.prince@verichron.com` - Multi org, 2 debts
- `clark.kent@verichron.com` - High volume, 20 debts

## Relationship with Factories

**Seeding** creates stable, pre-populated data:
- Same users every time
- Run once during setup
- Used for UI dev and manual testing

**Factories** create data on-demand during tests:
- Fresh data per test
- Programmatic API
- Used for API journey tests

They complement each other:

```typescript
// API Test - Uses factory
test('Create debt', async () => {
  const debt = await debtFactory.create(); // Fresh data
  // Test API
});

// UI Test - Uses seeded data
test('View debts', async () => {
  await loginAs('tony.stark@stark.com'); // Pre-seeded user
  const debt = await debtFactory.create(); // Add test-specific data
  // Test UI
});
```

## Migration from Old Structure

### Old (Deprecated)
```
e2e/fixtures/ui-dev/
├── seed-all-ui-personas.ts
├── 01-platform-setup.seed.ts
├── 02-multi-tenant-user.seed.ts
└── ...

apps/api-users/src/seeding/
└── seed.ts  (mixed system + test data)
```

### New (Current)
```
apps/api-users/src/rbac/
└── role-templates.ts  (configuration only)

e2e/seeding/
├── system/
├── core/
├── test-data/
└── index.ts  (one entry point)
```

## Adding New Test Data

### New Test User

Edit `test-data/org-users.seed.ts`:

```typescript
await seedOrgUsers(
  starkIndustries,
  starkRoles,
  usersDataSource,
  [
    // ... existing users
    { email: 'new.user@stark.com', firstName: 'New', lastName: 'User', role: 'orgAdmin' },
  ]
);
```

### New Test Organization

Edit `test-data/organizations.seed.ts`:

```typescript
const newOrg = await orgRepository.save({
  name: 'New Company',
  displayName: 'New Company Inc.',
  organizationType: 'COLLECTION_AGENCY',
  status: OrganizationStatus.ACTIVE,
});

// Then create org roles
const newOrgRoles = await seedOrgRoles(newOrg.id, newOrg.name, usersDataSource);
```

### New Role Type

1. Add template to `apps/api-users/src/rbac/role-templates.ts`
2. Update `core/org-roles.seed.ts` to create it
3. No need to change anything else - it's automatically created for all orgs

## Troubleshooting

### "PLATFORM_ADMIN role not found"

You need to run system seeding first. This happens automatically in `pnpm e2e setup`, but if you're calling seeding directly:

```typescript
await seedPermissions(dataSource);
await seedPlatformRole(dataSource);  // ← Must run before creating users
await seedPlatformAdminUser(dataSource);
```

### "Duplicate key violation"

Seeding is idempotent - it's safe to run multiple times. If you get duplicate key errors, it means:
- Data already exists (expected - will be skipped)
- OR you have orphaned data from old seeding (run `pnpm e2e db:reset`)

### "Cannot find module '@verichron/api-users/rbac'"

Make sure you build the API first, or check TypeScript path mapping in tsconfig.json.
