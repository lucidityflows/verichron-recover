# E2E Testing Quick Start Guide

This guide provides a rapid reference for daily tasks related to the Verichron platform's End-to-End (E2E) testing infrastructure. For a comprehensive overview, refer to the [main E2E Testing Documentation](../README.md).

## 1. Daily Workflow

### Starting Your Day

```bash
# Check environment status
pnpm e2e status

# If not running, start it
pnpm e2e setup
pnpm e2e ui-setup

# Verify data is seeded correctly
pnpm e2e db:verify
```

### Running Tests

```bash
# Run all cross-service tests
pnpm e2e test

# Run specific journey test by test case ID (e.g., TC-AUTH-001)
pnpm e2e test -j TC-AUTH-001

# Run tests in watch mode
pnpm e2e test -w

# Run tests for a specific microservice (e.g., api-users's service-level E2E tests)
pnpm e2e test -s api-users
```

### Debugging Failed Tests

```bash
# 1. Check service health
pnpm e2e status

# 2. Verify database has correct data
pnpm e2e db:verify

# 3. Inspect what's actually in the database
pnpm e2e db:inspect

# 4. View service logs for a specific service (e.g., api-users)
pnpm e2e logs api-users-test

# 5. Check specific database (e.g., users_db)
pnpm e2e db:inspect users_db
```

### Resetting Environment

```bash
# Soft reset (clean database, keep containers)
pnpm e2e db:reset
pnpm e2e ui-setup
pnpm e2e db:verify

# Full reset (rebuild everything - containers, volumes, images)
pnpm e2e clean
pnpm e2e setup
pnpm e2e ui-setup
pnpm e2e db:verify
```

## 2. Common Issues & Solutions

### "Login Failed" or 401 Errors

```bash
# First, verify test users exist
pnpm e2e db:verify

# If verification fails, reseed UI data
pnpm e2e ui-setup

# Check specific user
pnpm e2e db:inspect users_db
# Look for: platform.admin@verichron.com with password hash
```

### "Service Unhealthy" Errors

```bash
# Check which services are failing
pnpm e2e status

# View logs for failing service (e.g., api-users)
pnpm e2e logs api-users-test

# Restart services
pnpm e2e teardown
pnpm e2e setup
```

### "Database Schema" Errors

```bash
# Check table structure
pnpm e2e db:psql users_db

# In psql:
\d users
\d user_memberships
\d roles

# Full rebuild if schema is corrupted
pnpm e2e clean
pnpm e2e setup
pnpm e2e ui-setup
```

### Orval Type Errors

```bash
# Regenerate types (from the root of the affected UI microfrontend, e.g., ui-auth)
cd apps/ui-auth
pnpm orval

# Verify OpenAPI spec is correct
cat ../docs/openapi/openapi-users.json | jq '.components.schemas.AuthTokenDto'

# Check generated types
cat src/api/generated/models/authTokenDto.ts
```

## 3. Test Users

All test users have a default password: `Password123!`

### Platform Admin
-   `platform.admin@verichron.com` - Platform Administrator

### Stark Industries Users (Example Organization)
-   `tony.stark@stark.com` - Org Admin
-   `happy.hogan@stark.com` - Org Manager
-   `natasha.romanoff@stark.com` - Org Collector
-   `pepper.potts@stark.com` - Org User

### Wayne Enterprises Users (Example Organization)
-   `bruce.wayne@wayne.com` - Org Admin

### Multi-Org Users (Example)
-   `peter.parker@verichron.com` - User in Stark, Admin in Wayne

### Debtor Users (Example)
-   `steve.rogers@verichron.com` - Single org, 1 debt
-   `diana.prince@verichron.com` - Multi org, 2 debts
-   `clark.kent@verichron.com` - High volume, 20 debts

## 4. Database Commands

The `pnpm e2e db` command provides various utilities for managing the test databases:

```bash
# View all database commands
pnpm e2e db

# Available commands:
pnpm e2e db:reset      # Clean all tables (soft reset)
pnpm e2e db:seed       # Seed test data (WIP)
pnpm e2e db:psql       # Open psql shell for a specific database
pnpm e2e db:inspect    # Inspect database contents (e.g., table data)
pnpm e2e db:verify     # Verify seeding integrity
```

## 5. Environment Variables

E2E tests utilize the `.env.test` file located at the repository root to configure test-specific environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# PubSub Emulator
PUBSUB_EMULATOR_HOST=localhost:8085
```

## 6. Service Ports

The following default ports are used by the E2E test infrastructure services and microservices:

| Service                       | Port |
| :---------------------------- | :--- |
| `api-users-test`              | 3001 |
| `api-organizations-test`      | 3002 |
| `api-debts-test`              | 3003 |
| `api-debtors-test`            | 3004 |
| `api-transactions-test`       | 3005 |
| `api-communications-test`     | 3006 |
| `postgres-test`               | 5432 |
| `redis-test`                  | 6380 |
| `pubsub-emulator-test`        | 8085 |

## 7. Tips & Best Practices

### Before Committing

```bash
# Always verify all tests pass
pnpm e2e test

# Check database is in a clean state after tests
pnpm e2e db:verify
```

### Performance Optimization

```bash
# Use watch mode for rapid iteration during development
pnpm e2e test -w

# Run specific journeys during feature development to save time
pnpm e2e test -j auth

# Use db:inspect for quick database content checks instead of opening psql
pnpm e2e db:inspect users_db
```

### Debugging

```bash
# Enable verbose logging for detailed output
DEBUG=* pnpm e2e test

# Follow logs of a specific service in real-time
pnpm e2e logs api-users-test -f

# Check all service logs
pnpm e2e logs
```

## 8. Getting Help

-   **View all E2E CLI commands**: `pnpm e2e --help`
-   **View command-specific help**: `pnpm e2e test --help`

## 9. Troubleshooting Flowchart

```
Test Failing?
├─> pnpm e2e status (Are services healthy?)
│   ├─> No? Check service logs: pnpm e2e logs [service]
│   └─> Yes? Continue...
│
├─> pnpm e2e db:verify (Is test data seeded correctly?)
│   ├─> No? Reseed UI data: pnpm e2e ui-setup
│   └─> Yes? Continue...
│
├─> pnpm e2e db:inspect (Is database data as expected?)
│   ├─> No? Full rebuild: pnpm e2e clean && pnpm e2e setup && pnpm e2e ui-setup
│   └─> Yes? Review test code or API logic
│
└─> Still failing? Check:
    - Service logs: `pnpm e2e logs`
    - Database schema: `pnpm e2e db:psql`
    - OpenAPI specification: `cat apps/docs/openapi/openapi-users.json`
```
