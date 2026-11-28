# API-Organizations Microservice: Architectural Overview

This document provides a detailed overview of the `api-organizations` microservice's internal architecture, module structure, and critical design decisions regarding its database schema and migration strategy.

---

## Architecture

The `api-organizations` service is organized into **4 feature modules** + **1 common module**:

```
src/
├── app.module.ts              # Root module with global configuration
├── common/                    # Shared utilities, guards, decorators
│   ├── decorators/           # @Roles, @Permissions, @Public
│   ├── guards/               # Auth & authorization guards
│   ├── services/             # RequestContext
│   ├── interceptors/         # RequestContextInterceptor
│   ├── enums/                # Roles, Permissions, Status, Type
│   ├── dto/                  # Base DTOs, pagination, error response
│   ├── exceptions/           # Custom exceptions
│   ├── filters/              # Exception filters
│   └── utils/                # Query builders, sanitizers
├── profiles/                 # Organization identity & contact info
├── onboarding/               # New tenant provisioning
├── analytics/                # Business intelligence aggregation
├── settings/                 # Tenant configuration
├── entities/                 # TypeORM entities
├── events/                   # Event constants and types
└── migrations/               # Database migrations
```

### 1. Profiles Module (`src/profiles/`)

**Purpose**: Core organization identity and contact information management.

**Endpoints**:
- `GET /orgs` - List organizations (with pagination, filtering, sorting)
- `POST /orgs` - Create organization (requires ORG_ADMIN)
- `GET /orgs/:orgId` - Get organization details
- `PATCH /orgs/:orgId` - Update organization (requires ORG_ADMIN or ORG_MANAGER)
- `DELETE /orgs/:orgId` - Soft delete organization (requires ORG_ADMIN)
- `POST /orgs/:orgId/addresses` - Add address
- `PATCH /orgs/:orgId/addresses/:addressId` - Update address
- `DELETE /orgs/:orgId/addresses/:addressId` - Delete address
- *(Similar endpoints for emails and phone numbers)*

**Events Published**:
- `organizations.organization.updated` - When org profile changes
- `organizations.organization.status_changed` - When status changes (ACTIVE → SUSPENDED, etc.)
- `organizations.organization.name_changed` - When org name changes (includes old and new name)

**Key Features**:
- Change tracking: Only publishes events if fields actually changed
- Specific events: Publishes both general `OrganizationUpdated` and specific events like `OrganizationNameChanged`
- Audit trail: Uses RequestContext to capture `updatedBy` from JWT

**Implementation Status**: ✅ **COMPLETE**

### 2. Onboarding Module (`src/onboarding/`)

**Purpose**: Orchestrates the provisioning and setup of a new tenant organization.

**Endpoints**:
- `POST /onboarding` - Provision new organization (requires PLATFORM_ADMIN)
- `GET /onboarding/:orgId/status` - Check onboarding status

**Workflow** (Event-Driven):
```
┌─────────────────────────────────────────────────────┐
│ POST /onboarding (PLATFORM_ADMIN only)              │
│ • organizationName                                  │
│ • organizationType                                  │
│ • adminUser: { email, firstName, lastName }         │
└───────────────┬─────────────────────────────────────┘
                │
                ├─> 1. Create Organization (status: PROVISIONING)
                │
                ├─> 2. Publish OrganizationCreated Event ────┐
                │      • organizationId                       │
                │      • organizationName                     │
                │      • organizationType                     │
                │      • adminUser details                    │
                │      • createdBy (platform admin ID)        │
                │                                             │
                └─> 3. Set Organization to ACTIVE            │
                                                             │
┌────────────────────────────────────────────────────────────┘
│ GCP Pub/Sub: organizations-v1
│ Event: organizations.organization.created
└───┬─────────────────────────────────────────────────┐
    │                                                 │
    ▼                                                 ▼
┌──────────────────┐                       ┌──────────────────┐
│   api-users      │                       │ api-communications│
│                  │                       │                  │
│ 1. Create user   │                       │ 1. Send welcome  │
│ 2. Assign role   │                       │    email         │
│ 3. Send invite   │                       │ 2. Create        │
│                  │                       │    onboarding    │
└──────────────────┘                       │    campaign      │
                                           └──────────────────┘
```

**Key Design Decision**: No synchronous HTTP calls to api-users. The onboarding endpoint returns immediately after publishing the event. Admin user provisioning happens asynchronously.

**Events Published**:
- `organizations.organization.created` - Primary onboarding event

**Implementation Status**: ✅ **COMPLETE** (Phase 1)
- Synchronous HTTP calls removed
- Event-driven async provisioning implemented
- Platform admin guard applied

### 3. Analytics Module (`src/analytics/`)

**Purpose**: Provides high-level business intelligence and dashboard summaries.

**Endpoints**:
- `GET /organizations/:orgId/dashboard-summary` - Get dashboard metrics

**Design** (Event Orchestrator Pattern):
- **Pure Orchestrator**: Owns zero raw financial or debt data
- **Real-time Aggregation**: Queries multiple services via request-response events
- **Permission-Aware**: Only returns metrics the user is authorized to view

**Request-Response Flow**:
```
┌─────────────────────────────────────────────┐
│ GET /organizations/:orgId/dashboard-summary │
└───────────────┬─────────────────────────────┘
                │
                ├─> Publish Request Event (with correlationId)
                │   • AnalyticsDashboardSummaryRequested
                │
                ▼
┌──────────────────────────────────────────────────┐
│ Subscribe to Response Event                      │
│ • AnalyticsDashboardSummaryCompleted             │
└───────────────┬──────────────────────────────────┘
                │
                ├─> Wait for response matching correlationId (15s timeout)
                │
                ▼
┌──────────────────────────────────────────────────┐
│ Orchestrator performs workflow and sends response│
│ • @verichron/event-orchestrator listens for request    │
│ • Calls api-debts, api-transactions, etc.        │
│ • Publishes response event with same correlationId │
└───────────────┬──────────────────────────────────┘
                │
                ├─> Receive response event
                │
                ▼
            Return aggregated data
```

**Implementation Status**: ✅ **COMPLETE**
- Uses a manual request-response pattern in `AnalyticsService`.
- Publishes a request event and subscribes to a response event.
- Uses a correlation ID to match requests with responses.
- Implements a 15-second timeout.

### 4. Settings Module (`src/settings/`)

**Purpose**: Manages tenant-specific configuration and preferences.

**Endpoints**:
- `GET /organizations/:orgId/settings` - Get current settings
- `PATCH /organizations/:orgId/settings` - Merge new settings (deep merge)
- `PUT /organizations/:orgId/settings` - Replace all settings

**Data Model**:
```typescript
{
  branding: {
    logo_url: string,
    primary_color_hex: string,
    secondary_color_hex: string,
  },
  compliance: {
    fdcpa_strict_mode: boolean,
    record_all_calls: boolean,
    require_dual_consent: boolean,
  },
  communication: {
    default_timezone: string,
    business_hours: { start: string, end: string },
    max_contact_attempts_per_day: number,
  },
  // ... extensible JSONB
}
```

**Events Published**:
- `organizations.settings.updated` - When settings are modified (includes list of changed keys)

**Validation**: Settings are validated against FullSettingsDto schema before saving.

**Implementation Status**: ✅ **COMPLETE**

---

## Database & Migrations

### Schema Overview

**Database**: `organizations_db` (PostgreSQL)

**Tables**:
```sql
organizations
├── id (uuid, PK)
├── name (varchar 255, indexed)
├── displayName (varchar 255)
├── organizationType (varchar, indexed) -- AGENCY | CREDITOR | PARTNER
├── parentOrganizationId (uuid, FK to organizations, indexed)
├── taxId (varchar 50)
├── status (varchar, indexed) -- PROVISIONING | ACTIVE | SUSPENDED | INACTIVE
├── settings (jsonb)
├── createdAt (timestamp)
└── updatedAt (timestamp)

organization_addresses
├── id (uuid, PK)
├── organizationId (uuid, FK, indexed, cascade delete)
├── street1, street2, street3
├── city, state, postalCode, country
├── latitude, longitude
├── isPrimary (boolean)
├── addressCategory (varchar 50)
├── createdAt, updatedAt

organization_emails
├── id (uuid, PK)
├── organizationId (uuid, FK, indexed, cascade delete)
├── email (varchar 255, indexed)
├── isPrimary, isVerified (boolean)
├── emailCategory (varchar 50)
├── validFrom, validTo (timestamp)
├── createdAt, updatedAt

organization_phone_numbers
├── id (uuid, PK)
├── organizationId (uuid, FK, indexed, cascade delete)
├── phoneNumber (varchar 20)
├── extension (varchar 10)
├── isPrimary, isVerified (boolean)
├── phoneCategory (varchar 50)
├── validFrom, validTo (timestamp)
├── createdAt, updatedAt
```

### Migrations

**Location**: `src/migrations/`

**Initial Migration**: `1729800000000-InitialSchema.ts`
- Creates all 4 tables
- Adds indexes
- Sets up foreign keys with proper cascade behavior

**Migration Commands**:
```bash
# Generate migration from entity changes
pnpm migration:generate src/migrations/MyMigrationName

# Create empty migration
pnpm migration:create src/migrations/MyMigrationName

# Run pending migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Show migration status
pnpm migration:show
```

**Configuration**: `datasource.ts` at root of microservice
- Uses `DATABASE_URL` environment variable
- Points to `src/**/*.entity.{ts,js}` for entity discovery
- Points to `src/migrations/**/*.{ts,js}` for migrations
- `synchronize: false` (always use migrations in production)

**Best Practices**:
1. ✅ Never use `synchronize: true` in production
2. ✅ Always generate migrations from entity changes
3. ✅ Review generated migrations before running
4. ✅ Test migrations on staging before production
5. ✅ Include both `up()` and `down()` methods
6. ✅ Use transactions for complex migrations

**Implementation Status**: ✅ **COMPLETE** (Phase 1)
