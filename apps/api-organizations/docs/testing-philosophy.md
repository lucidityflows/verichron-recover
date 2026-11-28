# Unit & Integration Testing Philosophy: api-organizations

This document serves as the source of truth for the `api-organizations` testing strategy, complementing the project-wide E2E testing philosophy. It defines the types of tests we write, our conventions, and the core system rules our tests are designed to validate for this specific microservice.

## 1. Core Principles

- **Documentation First**: Every test file must begin with a header comment explaining the **System Rule(s)** it proves.
- **Deliberate & Meaningful**: Tests must validate specific business logic, edge cases, and integration points.

## 2. Two-Tier Testing Strategy

### Tier 1: Unit Tests (`*.service.spec.ts`, `*.guard.spec.ts`)
- **Purpose**: To test a single class in complete isolation. All external dependencies are mocked.

### Tier 2: Integration Tests (`*.controller.spec.ts`)
- **Purpose**: To test the collaboration of classes within a single feature module's request pipeline.
- **Method**: Use `@nestjs/testing` to create an in-memory test server for a specific module.

---

## 3. Documented System Rules for `api-organizations`

This section lists the core system rules for `api-organizations` that our tests will prove.

### ONBOARDING: Organization Onboarding Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-ONBD-001** | `provisionOrganization` must create an organization in `PROVISIONING` state, publish an `OrganizationCreated` event, and then update the state to `ACTIVE`. | `onboarding.service.spec.ts` | ✅ Implemented |
| **R-O-ONBD-002** | `provisionOrganization` must throw `OrganizationAlreadyExistsException` if an organization with the same name already exists. | `onboarding.service.spec.ts` | ✅ Implemented |
| **R-O-ONBD-003** | `provisionOrganization` must throw `EventPublishingFailedException` if the event bus is unavailable, after creating the initial organization record. | `onboarding.service.spec.ts` | ✅ Implemented |
| **R-O-ONBD-004** | `getOnboardingStatus` must return the correct, complete status for a fully provisioned organization. | `onboarding.service.spec.ts` | ✅ Implemented |
| **R-O-ONBD-005** | `getOnboardingStatus` must return the correct, partial status for an organization still in the `PROVISIONING` state. | `onboarding.service.spec.ts` | ✅ Implemented |

### PROFILES: Organization Profile Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-PROF-001** | `createOrganization` must successfully create a new organization in a `PROVISIONING` state. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-002** | `createOrganization` must throw `OrganizationAlreadyExistsException` if an organization with the same name already exists. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-003** | `findOneOrganization` must retrieve a single organization by its ID. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-004** | `findOneOrganization` must throw `OrganizationNotFoundException` if the organization is not found. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-005** | `updateOrganization` must successfully update an organization's profile and publish an `OrganizationUpdated` event. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-006** | `updateOrganization` must publish a specific `OrganizationNameChanged` event when the name is changed. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-007** | `updateOrganization` must publish a specific `OrganizationStatusChanged` event when the status is changed. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-008** | `updateOrganization` must not publish any events if no fields were actually changed. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-009** | `deleteOrganization` must soft delete an organization by setting its status to `INACTIVE`. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-010** | `findAllAddresses`, `findAllEmails`, `findAllPhoneNumbers` must return all respective contact information for a given organization. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-011** | `createAddress`, `createEmail`, `createPhoneNumber` must successfully create new contact information for an organization. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-012** | `updateAddress`, `updateEmail`, `updatePhoneNumber` must successfully update existing contact information. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-O-PROF-013** | `deleteAddress`, `deleteEmail`, `deletePhoneNumber` must successfully delete contact information. | `profiles.service.spec.ts` | ✅ Implemented |

### SETTINGS: Organization Settings Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-SET-001** | `getSettings` must successfully retrieve the settings for a given organization. | `settings.service.spec.ts` | ✅ Implemented |
| **R-O-SET-002** | `updateSettings` must merge new settings with existing ones and publish an `OrganizationSettingsUpdated` event. | `settings.service.spec.ts` | ✅ Implemented |
| **R-O-SET-003** | `replaceSettings` must completely replace existing settings and publish an `OrganizationSettingsUpdated` event. | `settings.service.spec.ts` | ✅ Implemented |
| **R-O-SET-004** | `updateSettings` and `replaceSettings` must validate the settings schema and throw `InvalidSettingsException` for invalid data. | `settings.service.spec.ts` | ✅ Implemented |

### ANALYTICS: Analytics Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-ANLY-001** | `getDashboardSummary` must successfully request and return a dashboard summary via the `EventOrchestratorClient`. | `analytics.service.spec.ts` | ✅ Implemented |
| **R-O-ANLY-002** | `getDashboardSummary` must throw `OrganizationNotFoundException` if the specified organization does not exist. | `analytics.service.spec.ts` | ✅ Implemented |
| **R-O-ANLY-003** | `getDashboardSummary` must throw `ServiceUnavailableException` if the event orchestration process fails or times out. | `analytics.service.spec.ts` | ✅ Implemented |

### CORE: Guards and Core Logic Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-CORE-001** | `OrgContextGuard` must allow platform admins access, with or without an `x-org-id` header, and set a platform-level `activeContext`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-O-CORE-002** | `OrgContextGuard` must allow organization users access if the `x-org-id` header matches their token's `organizationId` or if no `x-org-id` is provided. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-O-CORE-003** | `OrgContextGuard` must deny access with a `ForbiddenException` if an organization user provides an `x-org-id` that does not match their token. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-O-CORE-004** | `OrgContextGuard` must deny access if the user is unauthenticated or has a malformed token (e.g., missing claims). | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-O-CORE-005** | `OrgContextGuard` must correctly extract the organization ID for validation in the order of: `x-org-id` header, route params, request body, and finally the JWT claim. | `org-context.guard.spec.ts` | ✅ Implemented |

### EVENTS: Event Listener Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-O-EVNT-001** | Event listeners correctly process incoming events and handle validation errors. | `*.listener.spec.ts` | ❌ Not Implemented (No unit tests for event listeners found) |

---

## 4. Test Coverage & Status

*This section will be populated as tests are implemented.*
