# `contact` Feature Module

## 1. Overview

The `contact` module is a core supporting module within the `api-debtors` microservice. It is responsible for the management of all contact information associated with a `DebtorProfile`. This includes physical addresses, email addresses, and phone numbers.

This module is "headless" in that it does not expose any of its own API endpoints. Instead, it provides a set of services (`DebtorAddressService`, `DebtorEmailService`, `DebtorPhoneService`) that are consumed by other modules, such as `profiles` and `imports`, to handle the lifecycle of contact data.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **CRUD Services for Contact Info:** Provides `create`, `update`, `delete`, and `find` logic for addresses, emails, and phone numbers.
-   **Primary Contact Management:** Enforces the business rule that a `DebtorProfile` can have only one `isPrimary` contact of each type (address, email, phone).
-   **Data Normalization & Validation:**
    -   Normalizes emails to lowercase and trims whitespace.
    -   Normalizes phone numbers by stripping all non-digit characters.
    -   Prevents duplicate contact entries (e.g., the same email address) for a single debtor profile.
-   **Verification Status:** Manages the `isVerified` status for each piece of contact information.
-   **Event Publishing:** Publishes events whenever contact information is created, updated, or deleted.

### What This Module Does NOT Own

-   **API Endpoints:** This module is purely service-based and has no controllers. All operations are initiated by other modules.
-   **Debtor Profiles:** It does not own debtor profile data. It only stores a `debtorProfileId` (UUID) as a foreign key reference to a `DebtorProfileEntity` managed by the `profiles` module.
-   **User/Organization Context:** It relies on consuming services to provide necessary context like `organizationId` for security and data scoping.

---

## 3. Entities

This module manages three core entities, all of which are directly linked to a `DebtorProfileEntity`.

### `DebtorAddress`

Represents a physical address for a debtor profile.

-   **Purpose:** To store mailing, residence, or work addresses.
-   **Key Fields:**
    -   `debtorProfileId` (string, UUID): Foreign key to `DebtorProfileEntity`.
    -   `street1`, `street2`, `city`, `state`, `postalCode`, `country` (string): Standard address components.
    -   `addressCategory` (enum: `AddressCategory`): The type of address (e.g., `RESIDENCE_PRIMARY`).
    -   `isPrimary` (boolean): `true` if this is the primary address for the profile.
    -   `isVerified` (boolean): `true` if the address has been successfully verified.

### `DebtorEmail`

Represents an email address for a debtor profile.

-   **Purpose:** To store personal, work, or general email contacts.
-   **Key Fields:**
    -   `debtorProfileId` (string, UUID): Foreign key to `DebtorProfileEntity`.
    -   `email` (string): The email address, stored in a normalized (lowercase, trimmed) format.
    -   `emailCategory` (enum: `EmailCategory`): The type of email (e.g., `GENERAL`, `WORK`).
    -   `isPrimary` (boolean): `true` if this is the primary email for the profile.
    -   `isVerified` (boolean): `true` if the email has been successfully verified.
    -   `bounceStatus` (string): Tracks email delivery status.

### `DebtorPhone`

Represents a phone number for a debtor profile.

-   **Purpose:** To store mobile, home, or work phone numbers.
-   **Key Fields:**
    -   `debtorProfileId` (string, UUID): Foreign key to `DebtorProfileEntity`.
    -   `phoneNumber` (string): The phone number, stored in a normalized (digits-only) format.
    -   `category` (enum: `PhoneCategory`): The type of phone number (e.g., `MOBILE`, `HOME`).
    -   `isPrimary` (boolean): `true` if this is the primary phone number for the profile.
    -   `isVerified` (boolean): `true` if the phone number has been successfully verified.
    -   `canReceiveSms` / `isOptedOut` (boolean): Flags for communication compliance.

---

## 4. Endpoints

This module **does not expose any API endpoints**. Its functionality is accessed exclusively through its exported services.

---

## 5. Key Concepts & Patterns

### Service-Only Module

The `ContactModule` is an example of a "headless" or service-only module. It encapsulates a specific domain's business logic and data access without being directly exposed via HTTP. This promotes code reuse and separation of concerns, allowing other features like `Profiles` or `Imports` to orchestrate contact management.

### `isPrimary` Uniqueness

A key responsibility of this module is to enforce that only one address, email, or phone can be marked as `isPrimary` for any given `DebtorProfile`. Each service (`address.service`, `email.service`, `phone.service`) implements a private `unsetPrimary...` method. This method is called during `create` or `update` operations whenever a new contact is being set as primary, ensuring the previous primary is demoted in the same transaction.

### Data Normalization and Duplicate Prevention

To maintain data integrity, the services perform critical normalization and validation:
-   **Normalization:** Emails are converted to lowercase and trimmed, while phone numbers are stripped of all non-digit characters (`+`, `(`, `)`, `-`, ` `). This ensures a canonical representation for reliable duplicate checks.
-   **Duplicate Checks:** Before creating a new email or phone, the services query for an existing entry with the same normalized value for that specific `debtorProfileId`, throwing a `ConflictException` if a duplicate is found.

### Optimized Data Retrieval

The `findByProfile` method in each service demonstrates an optimized query pattern. When an `organizationId` is provided, the method uses a `createQueryBuilder` to perform an `INNER JOIN` to the `DebtorProfileEntity`. This allows the database to filter by both `debtorProfileId` and `organizationId` in a single, efficient query, enforcing tenant data isolation at the database level.

---

## 6. Events

### Published Events

This module publishes events whenever a contact record is created, updated, or deleted. This allows other services (both within `api-debtors` and in other microservices) to react to changes in a debtor's contact information.

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Address Updated** | `DEBTORS_PROFILE_ADDRESS_UPDATED` | `DebtorAddressUpdatedDto` | `debtors-v1` | Published when a `DebtorAddress` is created, updated, or deleted. |
| **Email Updated** | `DEBTORS_PROFILE_EMAIL_UPDATED` | `DebtorEmailUpdatedDto` | `debtors-v1` | Published when a `DebtorEmail` is created, updated, or deleted. |
| **Phone Updated** | `DEBTORS_PROFILE_PHONE_UPDATED` | `DebtorPhoneUpdatedDto` | `debtors-v1` | Published when a `DebtorPhone` is created, updated, or deleted. |

### Subscribed Events

This module does not subscribe to any events.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`profiles` module:** The `contact` module depends on the TypeORM entity definitions from the `profiles` module (`DebtorProfileEntity`, `DebtorAddress`, `DebtorEmail`, `DebtorPhone`).
-   **`events` module:** It uses DTOs from the local `events` module (e.g., `DebtorAddressUpdatedDto`) for event payload validation.

### External Integrations

-   **TypeORM:** Used as the ORM for all database interactions with the PostgreSQL `debtor-database`.
-   **`@verichron/event-publisher`:** The shared library used to publish events to GCP Pub/Sub.
-   **`@verichron/events`:** The shared library providing base event constants and topics.
-   **`@verichron/enums`:** The shared library providing common enumerations like `AddressCategory`, `EmailCategory`, and `PhoneCategory`.

---

## 8. Gaps & Future Work

-   **Hardcoded Country Default:** In `DebtorAddressService`, the `create` method defaults the `country` to 'USA' if not provided. This could be improved by making it a configurable setting or a required field.
-   **Limited Validation:** The services currently rely on basic normalization and database constraints. More sophisticated, real-time validation (e.g., via third-party APIs for address or phone validation) could be added in the future.
