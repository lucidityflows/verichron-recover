# E2E Testing Documentation

This section provides comprehensive documentation for the Verichron platform's End-to-End (E2E) testing infrastructure. E2E tests are crucial for validating critical user journeys and workflows across multiple microservices, ensuring the system functions as a cohesive whole.

## Table of Contents

-   **[1. Quick Start Guide](./quick-start.md)**
    -   A rapid guide to setting up the E2E environment and running tests.
-   **[2. Architecture Overview](./README.md#architecture-overview)**
    -   An overview of the E2E testing architecture, including test layers, helper utilities, and infrastructure services.
-   **[3. System Rules & Coverage](./system-rules.md)**
    -   The definitive list of documented system invariants and architectural rules, along with a summary of test coverage.
-   **[4. Writing Tests](./README.md#writing-tests)**
    -   Guidance on how to write effective E2E tests, including structure, naming conventions, and scenario planning.
-   **[5. Implementation Patterns](./patterns.md)**
    -   Detailed explanations of established patterns and lessons learned from E2E test development, including fixture architecture.
-   **[6. Troubleshooting](./README.md#troubleshooting)**
    -   Common issues and solutions for debugging E2E tests and infrastructure.
-   **[7. Environment Variables](./README.md#environment-variables)**
    -   Details on environment configuration for E2E tests.
-   **[8. CI/CD Integration](./README.md#ci/cd-integration)**
    -   Information on integrating E2E tests into continuous integration pipelines.

---

## Architecture Overview

All End-to-End (E2E) tests are centralized within the `e2e/` directory, focusing on comprehensive validation of the Verichron platform.

### API Journey Tests
-   **Location:** `e2e/journeys/`
-   **Purpose:** Test critical user journeys across multiple microservices. These are cross-service integration tests that validate event-driven flows and inter-service communication.
-   **Example:** `e2e/journeys/user-onboarding.e2e.spec.ts`

### UI Playwright Tests (Future)
-   **Location:** (To be defined, likely `e2e/ui-journeys/` or `e2e/playwright/`)
-   **Purpose:** Will validate user interface interactions and end-to-end user flows from a browser perspective.

For a detailed explanation of test fixtures, refer to the [Fixtures Architecture section in Implementation Patterns](./patterns.md#fixture-architecture).

## Writing Tests

### API Journey Test Example

```typescript
// Example from e2e/journeys/user-onboarding.e2e.spec.ts
import { createTestDatabaseHelper } from '../helpers/database.helper';
import { createApiUsersClient } from '../helpers/api-client.helper';
import { createEventListenerHelper } from '../helpers/event-listener.helper';
import { createOrganizationsFixture } from '../fixtures/organizations.fixture'; // Example

describe('User Onboarding Journey', () => {
  let dbHelper: ReturnType<typeof createTestDatabaseHelper>;
  let apiClient: ReturnType<typeof createApiUsersClient>;
  let eventListener: ReturnType<typeof createEventListenerHelper>;

  beforeAll(async () => {
    dbHelper = createTestDatabaseHelper();
    apiClient = createApiUsersClient();
    eventListener = createEventListenerHelper();

    await dbHelper.connect();
    await eventListener.startListening('user-events');

    const dataSource = dbHelper.getDataSource();
    const orgFixture = createOrganizationsFixture(dataSource); // Example fixture usage
    const org = await orgFixture.create({ name: 'Test Company' });
  });

  afterAll(async () => {
    await eventListener.stopAll();
    await dbHelper.cleanAllTables();
    await dbHelper.disconnect();
  });

  it('should complete user onboarding flow', async () => {
    const response = await apiClient.createUser(adminToken, {
      email: 'newuser@test.com',
      firstName: 'New',
      lastName: 'User',
    });
    expect(response.status).toBe(201);

    const event = await eventListener.waitForEvent('UserCreated', { timeout: 5000 });
    expect(event.payload.email).toBe('newuser@test.com');

    const user = await userFixture.findByEmail('newuser@test.com'); // Example fixture usage
    expect(user).toBeDefined();
    expect(user.status).toBe('PENDING');
  });
});
```

### Core Conventions

To ensure consistency and clarity across the test suite, all E2E tests must adhere to the following conventions.

#### Naming Convention
To ensure clarity and purpose, all E2E journey tests follow a standardized naming convention for their top-level `describe` block.

**Format**: `TC-SCOPE-ID: Description`

- **TC**: Stands for "Test Case".
- **SCOPE**: A short, uppercase identifier for the primary domain being tested (e.g., `USERS`, `ORG`, `PROVISION`).
- **ID**: A unique number for the test case within that scope (e.g., `001`).
- **Description**: A brief, human-readable summary of the journey being tested.

**Example**: `describe('TC-ORG-PROVISION-001: Platform Admin Provisions New Organization', () => { ... });`

#### Test Documentation
Each E2E journey test file **must** begin with a header comment that clearly states the "System Rule" it is responsible for validating. This provides immediate context and links the test code back to a core business or architectural requirement.

**Example**:
```typescript
/**
 * @system-rule R-AUTH-001
 * @description Ensures that a user can only generate an access token (JWT) for an organization
 *              of which they are a member.
 */
describe('TC-AUTH-001: User Token Generation', () => { ... });
```

#### Best Practices

1.  **Clean State**: Always clean databases between test suites to ensure isolation.
2.  **Unique IDs**: Use UUIDs for identifiers to prevent conflicts.
3.  **Event Verification**: Wait for events to verify asynchronous operations.
4.  **Proper Teardown**: Always clean up resources in `afterAll` hooks.
5.  **No Parallel Test Suites**: Avoid running test suites in parallel to prevent database conflicts (unless explicitly designed for it).
6.  **Health Checks**: Ensure infrastructure is healthy before running tests.
7.  **Meaningful Names**: Use descriptive test names that explain the journey or behavior being validated (following the naming convention above).

---

## Helpers & Utilities

The E2E testing framework provides several helper utilities to simplify test writing:

-   **[Database Helper](quick-start.md#database-commands)**: Manages database connections, cleaning, and direct queries.
-   **[API Client Helper](quick-start.md#running-tests)**: Provides a convenient interface for making authenticated API requests.
-   **[Event Listener Helper](quick-start.md#event-listener-not-capturing-events)**: For listening to and asserting on published events.
-   **[Fixtures](./patterns.md#fixture-architecture)**: For creating and managing test data.
-   **[Health Check Helper](quick-start.md#troubleshooting)**: For verifying infrastructure readiness.

---

## Troubleshooting

For common issues and solutions, refer to the [Quick Start Guide Troubleshooting section](./quick-start.md#troubleshooting).

---

## Environment Variables

E2E tests use `.env.test` at the repository root. This file configures test-specific settings for databases, Redis, Pub/Sub emulator, and JWT secrets.

---

## CI/CD Integration

E2E tests are designed for integration into CI/CD pipelines. A typical GitHub Actions workflow would involve:

1.  Checking out code.
2.  Setting up Node.js and pnpm.
3.  Installing dependencies.
4.  Starting Docker Compose services (PostgreSQL, Redis, Pub/Sub emulator).
5.  Running E2E tests.
6.  Tearing down services.

For a detailed example, refer to the `pnpm e2e --help` output or the `e2e/README.md` file (soon to be archived).

---

## Related Documentation

-   **[Quick Start Guide](./quick-start.md)**
-   **[System Rules & Coverage](./system-rules.md)**
-   **[Implementation Patterns & Fixture Architecture](./patterns.md)**
-   **[Test Case Roadmap](./test-case-roadmap.md)** (future)
-   **Detailed Test Case Specifications**: `e2e/test-specs/` (future migration)
