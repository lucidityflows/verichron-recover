# `profiles` Module

## 1. Overview

The `profiles` module is the core data management module within the `api-organizations` microservice. It serves as the definitive source of truth for the identity, contact information, settings, and hierarchy of every tenant organization on the Verichron platform.

This module provides a comprehensive suite of CRUD (Create, Read, Update, Delete) operations for managing organization profiles and their associated sub-resources like addresses, emails, and phone numbers. The data managed by this module is fundamental to the platform's multi-tenant architecture.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `Organization` Entity:** It owns the core `Organization` TypeORM entity and all its related sub-entities for contact information (`OrganizationAddress`, `OrganizationEmail`, `OrganizationPhoneNumber`).
-   **Organization Profile Management:** It owns all the business logic and API endpoints for creating, querying, updating, and deactivating organization profiles.
-   **Event Publishing:** It is responsible for publishing domain events related to changes in an organization's state, such as `OrganizationUpdated` and `OrganizationNameChanged`.

### What This Module Does NOT Own

-   **Onboarding Orchestration:** It does not manage the multi-step, cross-service onboarding workflow. It is called by the `onboarding` module, which orchestrates that process. This module's `createOrganization` endpoint is a simple, direct database insertion.
-   **User and Role Data:** It has no knowledge of users or roles; that is the responsibility of `api-users`.
-   **Tenant-Specific Business Data:** It does not store any data related to debts, payments, or communications.

---

## 3. Entities

### `Organization`
The central entity representing a single tenant on the platform.
- **Purpose:** To store the core identity, status, settings, and hierarchical position of a tenant.
- **Key Fields:**
    - `id` (string, UUID): The primary key.
    - `name` (string): The legal name of the organization.
    - `displayName` (string | null): A user-facing display name.
    - `organizationType` (enum): The type of organization (e.g., `COLLECTION_AGENCY`, `CREDITOR`).
    - `status` (enum): The lifecycle status of the organization (e.g., `PROVISIONING`, `ACTIVE`, `INACTIVE`).
    - `settings` (JSONB): A flexible field for storing tenant-specific configuration.
    - `parentOrganizationId` (string | null): A foreign key to another `Organization`, enabling hierarchical structures.

### Contact Information Sub-Entities
-   **`OrganizationAddress`:** Stores one or more physical addresses for an organization.
-   **`OrganizationEmail`:** Stores one or more email contacts for an organization.
-   **`OrganizationPhoneNumber`:** Stores one or more phone numbers for an organization.

Each of these entities has a many-to-one relationship with the `Organization` entity and supports an `isPrimary` flag to denote the main point of contact for that type.

---

## 4. Endpoints

### Organization Management (`/orgs`)
-   `POST /orgs`: Creates a new organization. Requires platform-level permissions.
-   `GET /orgs`: Lists all organizations. Platform admins see all orgs; regular users see only their own.
-   `GET /orgs/:orgId`: Retrieves the detailed profile for a single organization.
-   `PATCH /orgs/:orgId`: Updates an organization's profile information.
-   `DELETE /orgs/:orgId`: Soft-deletes an organization by setting its status to `INACTIVE`.

### Sub-Resource Management
The module also provides full CRUD endpoints for managing an organization's contact details under the following nested routes:
-   **Addresses:** `GET`, `POST`, `PATCH`, `DELETE` under `/orgs/:orgId/addresses`
-   **Emails:** `GET`, `POST`, `PATCH`, `DELETE` under `/orgs/:orgId/emails`
-   **Phone Numbers:** `GET`, `POST`, `PATCH`, `DELETE` under `/orgs/:orgId/phone-numbers`

---

## 5. Key Concepts & Patterns

### Centralized Tenant Data Management
This module acts as the definitive source for all tenant data. Any other service that needs to know an organization's name, status, or settings must query this service or, more commonly, rely on the data propagated through domain events published by this module.

### Hierarchical Organization Structure
The `parentOrganizationId` field on the `Organization` entity allows for the creation of parent-child relationships. This is a key feature for supporting clients with complex corporate structures, such as a large national agency with multiple regional offices, where each office can be represented as a sub-organization.

### Scoped Data Access
The `findAllOrganizations` endpoint is a prime example of how data access is scoped within the platform. The service method checks the `orgId` from the user's `activeContext`.
- If the `orgId` is `null`, it's a platform administrator, and the query returns all organizations.
- If the `orgId` is present, it's a regular organization user, and a `WHERE` clause is added to the query to ensure only that user's own organization is returned.

### Granular Event Publishing on Update
The `updateOrganization` service method demonstrates a powerful eventing pattern. After any update, it publishes a generic `OrganizationUpdated` event with a list of the fields that were changed. Additionally, if a particularly important field like `name` or `status` was changed, it publishes a second, more specific event (`OrganizationNameChanged` or `OrganizationStatusChanged`). This allows downstream services to either react to any change or subscribe only to the specific changes that are relevant to them.

---

## 6. Events

### Published Events
The `ProfilesService` publishes events when an organization's data is modified.

| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Organization Updated** | `ORGANIZATIONS_ORGANIZATION_UPDATED` | Any field on an organization record is updated. |
| **Name Changed** | `ORGANIZATIONS_ORGANIZATION_NAME_CHANGED` | The `name` field of an organization is changed. |
| **Status Changed** | `ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED`| The `status` field of an organization is changed. |

---

## 7. Dependencies & Integrations

### Internal Dependencies
-   **`events` module:** Used to inject the `EventPublisher` for publishing domain events.
-   **`core` module:** Relies on the guards and decorators from this module to secure its endpoints.

### External Integrations
-   **PostgreSQL:** The primary database where all organization-related entities are stored, accessed via TypeORM.
-   **`api-users` (and others):** A key data provider *to* other services. For example, `api-users` subscribes to `OrganizationNameChanged` to keep its denormalized `organizationName` field in sync.

---

## 8. Gaps & Future Work

-   **Missing `updatedBy` Context:** The `updateOrganization` method has a `TODO` indicating that the `updatedBy` field in published events is currently hardcoded. This should be populated with the ID of the authenticated user making the change, which would require using the `RequestContext` service.
-   **Event on Deletion:** The `deleteOrganization` method, which performs a soft delete by setting the status to `INACTIVE`, does not currently publish an `OrganizationStatusChanged` event. This is an inconsistency with the `updateOrganization` method and should be added to ensure downstream services are notified of the deactivation.
