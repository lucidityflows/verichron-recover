# DEBTORS Microservice Restructuring Plan

**Status**: Implemented
**Author**: Verichron Engineering Team

---

## Executive Summary

This document details the **implemented** restructuring of the `api-debtors` microservice to address the **previously identified** "bloated" state of the `ProfilesModule`. The goal **was** to achieve a clearer separation of concerns, improve maintainability, reduce repetition, and better align the microservice's internal architecture with established bounded contexts and NestJS modularity best practices.

## 1. Current Architecture Overview

The `api-debtors` microservice is currently organized into the following main modules:

*   `app/` (core application setup)
*   `core/` (shared utilities, guards, decorators, etc.)
*   `demographics/` (manages sensitive `DebtorDemographics`)
*   `documents/` (manages `Document` metadata)
*   `events/` (event DTOs and Pub/Sub integration)
*   `identity/` (manages global `DebtorIdentityEntity`)
*   `profiles/` (manages `DebtorProfileEntity`, `DebtorAddress`, `DebtorEmail`, `DebtorPhone`)
*   `verifications/` (manages `VerificationRequest`)

The `profiles` module is the primary area of concern due to its expansive scope.

## 2. Problem Statement: The Bloated `ProfilesModule`

The `ProfilesModule`, and specifically the `ProfilesService`, **previously** encapsulated a wide array of responsibilities, leading to:

*   **High Complexity:** The `ProfilesService` class is very large, making it difficult to read, understand, and debug.
*   **Unclear Boundaries:** It mixes core `DebtorProfile` management with detailed management of its related sub-entities (addresses, emails, phones) and also contains logic specific to the overall `DebtorIdentity` and import processes.
*   **Repetition:** Significant portions of the code are repeated across the contact management methods (e.g., verifying profile existence, `isPrimary` logic, duplicate checks).
*   **Difficult Maintenance:** Changes in one area (e.g., how emails are managed) can inadvertently affect other, seemingly unrelated parts of the service.
*   **Reduced Testability:** Large services are harder to unit test effectively and require more complex mock setups.

Specifically, `ProfilesService` **previously** handled:
1.  Core CRUD operations for `DebtorProfileEntity`.
2.  CRUD operations for `DebtorAddress` entities.
3.  CRUD operations for `DebtorEmail` entities.
4.  CRUD operations for `DebtorPhone` entities.
5.  Logic for creating/finding `DebtorIdentity` (e.g., in the `create` and `findOrCreateFromImport` methods).
6.  Specialized `findOrCreateFromImport` logic for handling import workflows.

## 3. Implemented Architecture: Modular Decomposition

To address the issues above, we **decomposed** the `api-debtors` microservice into more granular, focused modules and services.

### A. Core Modules (Refactored)

1.  **`IdentityModule` (Refactored & Expanded)**
    *   **Responsibility:** To be the single source of truth and logic for the global `DebtorIdentityEntity`. This module **now** centralizes all de-duplication and identity matching logic.
    *   **Entities:** `DebtorIdentityEntity`.
    *   **Service:** `DebtorIdentityService` (responsible for `findOrCreateDebtorIdentity`, linking/unlinking `userId`).
2.  **`ProfilesModule` (Refactored & Streamlined)**
    *   **Responsibility:** To manage the core CRUD operations for the `DebtorProfileEntity` itself. This module **now** depends on `IdentityModule` to retrieve or create the `DebtorIdentity` when a profile is being created.
    *   **Entities:** `DebtorProfileEntity`.
    *   **Service:** `DebtorProfileService` (focused solely on `DebtorProfile` CRUD).

### B. New Feature Modules (Extracted from `ProfilesModule`)

1.  **`ContactModule` (New)**
    *   **Responsibility:** To manage all contact information entities associated with a `DebtorProfile`. This **extracted** the `Address`, `Email`, and `Phone` logic from `ProfilesModule`.
    *   **Entities:** `DebtorAddress`, `DebtorEmail`, `DebtorPhone`.
    *   **Services:** `DebtorAddressService`, `DebtorEmailService`, `DebtorPhoneService` (or a single `DebtorContactService` that delegates to specialized repositories). These services would depend on `ProfilesModule` to verify `DebtorProfile` existence.
2.  **`ImportsModule` (New)**
    *   **Responsibility:** To encapsulate the specialized logic for processing debtor data originating from import files. This module **now** contains the `findOrCreateFromImport` method.
    *   **Services:** `DebtorImportProcessor` (or `DebtorImportService`). This service would orchestrate calls to `IdentityModule`, `ProfilesModule`, and `ContactModule` to process imported debtor data.

### C. Existing Modules (No Major Scope Changes)

*   **`DemographicsModule`:** Manages `DebtorDemographics`.
*   **`DocumentsModule`:** Manages `Document` metadata.
*   **`VerificationModule`:** Manages `VerificationRequest`s.
*   **`EventsModule`:** Event DTOs and Pub/Sub integration.
*   **`CoreModule`:** Shared infrastructure.

## 4. Benefits of the Implemented Restructuring

*   **Clearer Bounded Contexts:** Each module/service **now has** a more precise and singular responsibility, adhering more closely to microservice design principles.
    *   `Identity`: Who is the unique person?
    *   `Profiles`: Who is this person within this organization?
    *   `Contact`: How can we reach this person (within this organization's profile)?
    *   `Demographics`: What sensitive PII do we know about this person?
    *   `Documents`: What documents do we have for this person?
    *   `Verification`: What is the verification status of this person's data?
    *   `Imports`: How do we ingest external data for this person?
*   **Improved Maintainability:** Smaller, more focused modules and service files are significantly easier to read, understand, and update.
*   **Reduced Repetition:** Common patterns and helper methods **are** centralized within their respective services, reducing code duplication.
*   **Enhanced Testability:** Smaller, more isolated units of code are easier to unit test, leading to more robust and reliable features.
*   **Better Scalability and Future-Proofing:** The modular design allows for easier introduction of new features, scaling of specific functionalities, and potentially independent team ownership of distinct debtor-related domains.

## 5. Impact on Ongoing Tasks (E2E Seeding)

This architectural restructuring **was** a foundational step that **directly impacted** our ability to correctly seed and manage debtor data. The **initial** E2E seeding failures (e.g., the "Diana Prince" scenario) **highlighted** the inadequacy of the previous single-entity model.

Following this restructuring:

*   The `e2e/seeding/test-data/debtors.seed.ts` script **was updated** to correctly leverage the `DebtorIdentityService` (to get a global identity) and the `DebtorProfileService` (to create organization-specific profiles).
*   The `DEBT-IMPORT-DEBTOR-FLOW.md` architecture for batch import processing **now** relies heavily on this modular separation, particularly for the `DebtorIdentityService` and `DebtorImportProcessor`.
*   Without this restructuring, properly seeding multi-organization debtors and ensuring data integrity in the `api-debtors` microservice **remained** problematic and **continued** to lead to errors or logically inconsistent test data. This problem has been resolved by the implementation of this architecture.
