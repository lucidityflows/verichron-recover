# API-Debtors Microservice: Architectural Overview

## Introduction

The `api-debtors` microservice stands as the central nervous system for debtor-related data within the Verichron SaaS platform. It acts as the definitive source of truth, meticulously managing the lifecycle of debtor information from initial ingestion to ongoing maintenance and verification. For a high-level understanding of its features and role within the broader SaaS ecosystem, please refer to the [Feature Overview and System Context](docs/feature-overview.md) document.

This service is designed to provide a comprehensive, compliant, and scalable foundation for all debtor-centric operations, seamlessly integrating with other critical microservices across our monorepo.

**Bounded Context**: `api-debtors` provides clear and exclusive ownership over all aspects related to debtor data, ensuring data integrity and consistency across the platform.

## Core Architectural Decisions

The `api-debtors` microservice is built upon two foundational architectural decisions that drive its multi-tenancy capabilities, compliance adherence, and internal modularity.

### 1. Separation of Debtor Identity and Debtor Profile

A cornerstone of our design is the clear distinction between a global debtor identity and an organization-specific debtor profile:

*   **Debtor Identity (`DebtorIdentityEntity`)**: Represents a unique real-world person, regardless of their affiliations with different organizations. This is the "golden record" for an individual, serving as their global identifier across the entire system. It can optionally link to a registered user account (`userId` from `api-users`).
*   **Debtor Profile (`DebtorProfileEntity`)**: Represents a person's specific data and context within a *single organization*. This entity is scoped to an `organizationId` and links back to its corresponding `DebtorIdentity`. A single person can have multiple `DebtorProfile` records—one for each organization they are a debtor in.

**Rationale and Benefits**:
This separation is paramount for:
*   **Multi-Tenancy**: It elegantly solves scenarios where the same individual is a debtor for multiple organizations, ensuring data isolation and preventing accidental data leakage between tenants.
*   **Compliance**: Simplifies fulfilling "Right to be Forgotten" requests, allowing the removal of an organization-specific profile without affecting other, legally distinct profiles.
*   **Data Integrity**: Guarantees that sensitive and organization-specific data remains isolated, while a consistent global view of the individual is maintained.
*   **Scalability**: Prevents complex data duplication issues that arise from trying to manage multi-tenant data within a single entity.

### 2. Modular Decomposition

The microservice's internal structure is rigorously organized into distinct feature modules, promoting a high degree of separation of concerns and aligning with NestJS modularity best practices. This decomposition addresses the complexities of managing diverse debtor-related functionalities.

**Key Modules and Their Responsibilities**:

*   **`IdentityModule`**: Manages the global `DebtorIdentityEntity` records. It centralizes logic for de-duplication, robust identity matching (using `userId`, SSN hash, email), and linking user accounts to identities.
*   **`ProfilesModule`**: Manages the core `DebtorProfileEntity` records, specifically the data pertaining to a person within a given organization. It handles CRUD operations for profiles and relies on the `IdentityModule` for global identity context.
*   **`ContactModule`**: Dedicated to managing all contact information (`DebtorAddress`, `DebtorEmail`, `DebtorPhone`) associated with a `DebtorProfile`. It encapsulates CRUD operations, primary contact logic, and duplicate checks for all contact types.
*   **`DemographicsModule`**: Manages the storage and retrieval of sensitive debtor PII, *designed with provisions for stricter access controls and audit logging, and planned SSN encryption*.
*   **`DocumentsModule`**: Handles debtor-specific document metadata and manages references to files *designed to be stored externally in Google Cloud Storage (GCS)*. It orchestrates document uploads and generates signed URLs for secure access, *though the direct GCS client integration is currently stubbed and pending full implementation*.
*   **`VerificationModule`**: Orchestrates event-driven data validation and skip tracing workflows for debtor profiles. It manages `VerificationRequest`s and coordinates with third-party providers.
*   **`ImportsModule`**: Manages the asynchronous, event-driven batch processing of debtor data from import files. It orchestrates import batches, leverages the `IdentityModule` and `ProfilesModule` for data ingestion, and handles retry logic.

**Benefits of Modular Design**:
*   **Clear Bounded Contexts**: Each module has a singular, well-defined responsibility.
*   **Improved Maintainability**: Smaller, focused modules are easier to understand, develop, and update.
*   **Enhanced Testability**: Isolation of concerns leads to more robust and reliable unit and integration tests.
*   **Scalability and Future-Proofing**: Facilitates easier introduction of new features and potential independent team ownership of distinct domains.

## Key Implementation Choices

Our architectural decisions are supported by a set of robust implementation choices:

*   **Event-Driven Architecture**: The `api-debtors` service heavily utilizes event publishing and subscribing via GCP Pub/Sub. This enables seamless inter-service communication, drives asynchronous workflows (like imports and verifications), and enhances overall system scalability and resilience.
*   **Standardized Authorization**: Security and multi-tenancy are enforced through the platform's global authorization pipeline, including `JwtAuthGuard`, `OrgContextGuard`, and `PermissionsGuard`. The `RequestContext` service provides organization context transparently across the service.
*   **Soft Deletes**: To ensure audit trails and compliance with financial regulations, all data deletion operations are performed as soft deletes (e.g., setting a `deletedAt` timestamp or an `isArchived` flag).
*   **Google Cloud Storage (GCS)**: Documents associated with debtor profiles are stored securely in GCS, with the `DocumentsModule` managing only their metadata and access.
*   **Comprehensive Error Handling**: Implements a robust, production-ready error handling system with standardized responses, appropriate HTTP status codes, and automatic PII sanitization. For details, see [Error Handling Strategy](docs/technical-details/error-handling.md).
*   **Technical Stack**: Built using **NestJS** for a highly structured and scalable application, **TypeORM** as the Object-Relational Mapper for efficient database interactions, and **PostgreSQL** as the robust relational database (`debtor-database`).

## Architectural Journey and Evolution

The current robust architecture of the `api-debtors` microservice is the result of intentional design and continuous refinement. Initially, a monolithic approach to debtor data management presented challenges, particularly in handling multi-tenancy and ensuring data integrity. The evolution of this service involved a significant architectural pivot:

*   **Addressing Data Conflict**: The initial single `Debtor` entity suffered from conflicting constraints, making it impossible to correctly represent a registered user as a debtor in multiple organizations. This led to a fundamental re-architecture into the distinct `DebtorIdentity` and `DebtorProfile` entities.
*   **Modular Refactoring**: The `ProfilesModule`, which initially became overly comprehensive, was strategically refactored. Its responsibilities were decomposed into the specialized `Identity`, `Contact`, and `Imports` modules, among others, to foster clearer bounded contexts and improve maintainability.
*   **Unblocking E2E Testing**: These architectural changes were critical in resolving initial E2E seeding failures, enabling the creation of realistic and functional test data that accurately reflects multi-organization debtor scenarios.

This journey highlights our commitment to building a scalable, compliant, and maintainable platform, adapting our architecture to meet complex business requirements and ensuring the highest standards of data integrity and security.

## Conclusion

The `api-debtors` microservice embodies a modern, event-driven, and highly modular architecture designed for the stringent demands of a FinTech environment. Its careful separation of global identity from organization-specific profiles, coupled with a granular internal structure, ensures a scalable, compliant, and easily maintainable solution for debtor data management.