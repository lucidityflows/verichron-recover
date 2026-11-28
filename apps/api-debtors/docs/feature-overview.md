# API-Debtors Microservice: Feature Overview and System Context

## Introduction

The `api-debtors` microservice is the central nervous system for debtor-related data within the Verichron SaaS platform. It acts as the definitive source of truth, meticulously managing the lifecycle of debtor information from initial ingestion to ongoing maintenance and verification. This service is designed to provide a comprehensive, compliant, and scalable foundation for all debtor-centric operations, seamlessly integrating with other critical microservices across our monorepo.

## Core Features

The `api-debtors` microservice empowers the Verichron platform with the following high-level capabilities:

*   **Global Debtor Identity Management**: Provides a unique, global identifier for each real-world person across the entire platform. This `DebtorIdentity` ensures consistent tracking of individuals regardless of their organizational affiliations, acting as the "golden record."
*   **Organization-Specific Debtor Profiles**: Allows for the creation and management of isolated `DebtorProfile` records. Each profile represents a person's data within a single organization, enabling secure multi-tenancy where data is compartmentalized and accessible only to the owning organization.
*   **Comprehensive Contact Information Management**: Facilitates the storage, retrieval, and updating of all essential contact details—addresses, email addresses, and phone numbers—for each debtor profile. This includes managing primary contacts and ensuring data validity.
*   **Sensitive Demographics Handling**: Securely manages sensitive Personally Identifiable Information (PII) such as SSN, income, and employment status. This module is designed with stringent access controls and audit logging to ensure compliance with financial regulations.
*   **Document Management & Referencing**: Provides functionality to store metadata for debtor-specific documents (e.g., proof of address, verification records) and manages secure references to the actual files stored in Google Cloud Storage (GCS). It supports document uploads and secure time-limited downloads.
*   **Event-Driven Data Verification**: Orchestrates various data verification workflows, including address, phone, and email validation, as well as skip tracing. This is driven by an event-based system that integrates with third-party providers to ensure data accuracy and compliance.
*   **Asynchronous Debtor Data Imports**: Manages the high-volume, asynchronous batch processing of debtor data from external portfolio imports. This feature intelligently de-duplicates identities, creates organization-specific profiles, and integrates new data seamlessly into the system.

## Role in the Monorepo

Within the Verichron monorepo, `api-debtors` is developed and maintained as a standalone NestJS microservice. It adheres to the platform's standardized development practices, shared libraries (e.g., `@verichron/event-publisher`, `@verichron/types`), and build pipelines. Its modular architecture facilitates independent development and testing, while the monorepo structure ensures consistent tooling and dependency management across the entire SaaS.

## SaaS Ecosystem Interactions

`api-debtors` operates as a central data hub, interacting dynamically with other microservices to support end-to-end business processes:

*   **`api-debts`**:
    *   **Upstream**: `api-debts` initiates the debtor data import process by publishing `debts.portfolio.import_started` events, which `api-debtors` consumes to ingest new debtor profiles.
    *   **Downstream**: `api-debts` relies on `api-debtors` to query and retrieve accurate debtor profile information for associating debts.
*   **`api-users`**:
    *   **Interaction**: `api-debtors` is designed to link global `DebtorIdentity` records with user accounts managed by `api-users`. This enables debtors who register as users to view their consolidated debt information across multiple organizations. Events are crucial for this linkage.
*   **`api-communications`**:
    *   **Interaction**: `api-debtors` publishes events (e.g., `DEBTORS_DEBTOR_CREATED`) that `api-communications` consumes. This allows `api-communications` to trigger automated workflows, such as sending invitations to newly created debtors to register on the platform.
*   **`ui-platform`, `ui-organizations`, `ui-debtors` (Microfrontends)**:
    *   **Interaction**: These user interfaces directly consume the RESTful APIs exposed by `api-debtors` to display, create, and manage debtor profiles, contact information, demographics, documents, and verification statuses.
*   **Event Bus (GCP Pub/Sub)**: All inter-service communication related to debtor lifecycle events (creation, updates, verification requests, import completions) occurs asynchronously via the platform's event bus, fostering loose coupling and high resilience.

## Conclusion

The `api-debtors` microservice is a foundational pillar of the Verichron SaaS, providing a robust, compliant, and highly integrated solution for debtor data management. Its strategic design, encompassing global identity, modular features, and extensive inter-service communication, ensures accuracy, scalability, and adherence to regulatory requirements, ultimately empowering efficient and effective debt collection operations across the platform.
