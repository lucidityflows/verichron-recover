# API-Organizations Microservice: Feature Overview and System Context

This document provides a high-level overview of the `api-organizations` microservice, detailing its core features and its role within the Verichron SaaS platform.

## Overview

The `api-organizations` microservice serves as the single source of truth for **Organization/Tenant** management within the Verichron platform. It is a foundational service responsible for managing the identity, configuration, and lifecycle of all client organizations, as well as providing aggregated business intelligence.

### What This Service Does (Core Features)

*   **Organization Identity Management**: Provides full CRUD (Create, Read, Update, Delete) operations for managing organization profiles, including basic identity details and display names.
*   **Contact Information Management**: Manages comprehensive contact details—addresses, emails, and phone numbers—associated with each organization.
*   **Organization Hierarchy**: Supports the definition and management of parent-child relationships between organizations, allowing for complex corporate structures (e.g., a parent collection agency with multiple subsidiaries).
*   **Tenant Configuration**: Stores and manages organization-specific settings and preferences using a flexible JSONB field, allowing for extensive customization per tenant.
*   **Onboarding Orchestration**: Orchestrates the event-driven provisioning of new tenant organizations onto the platform, ensuring a decoupled and resilient onboarding workflow. This includes initiating the creation of the initial organization administrator user.
*   **Business Intelligence Aggregation**: Aggregates high-level business intelligence metrics for dashboard summaries, acting as an event orchestrator to gather data from various microservices. This provides real-time insights into organization performance.
*   **Multi-Tenancy Support**: Fully supports the platform's multi-tenancy model, ensuring data isolation and context management via the `x-org-id` header and internal authorization mechanisms.
*   **Role-Based Access Control (RBAC)**: Supports comprehensive RBAC, defining various organization roles (e.g., Admin, Manager, Agent) and platform roles (e.g., Platform Admin, Platform Support) that govern access within the microservice.

### What This Service Does NOT Do (Critical Boundaries)

To maintain clear bounded contexts and prevent circular dependencies, `api-organizations` strictly adheres to the following boundaries:

*   **Does NOT own User Management**: User identities, authentication, sessions, and core RBAC definitions are exclusively owned and managed by `api-users`.
*   **Does NOT own Portfolio/Debt Management**: Debt records, their lifecycle, and portfolio groupings are owned by `api-debts`.
*   **Does NOT own Financial Transactions**: Payments, accounting, and detailed financial transaction processing are owned by `api-transactions`.
*   **Does NOT make Direct HTTP Calls**: All inter-service communication is asynchronous and event-driven, ensuring high decoupling and resilience.

## Role in the Monorepo

`api-organizations` is a core service within the Verichron monorepo. It acts as a central **provider of organization context** to other services. For example, `api-users` consumes `OrganizationCreated` events from `api-organizations` to provision initial admin users, and updates user denormalized data based on `OrganizationNameChanged` events.

## SaaS Ecosystem Interactions

`api-organizations` is a pivotal service, interacting with various other microservices to support the platform's core functions:

*   **`api-users`**:
    *   **Upstream**: Publishes `OrganizationCreated`, `OrganizationUpdated`, `OrganizationNameChanged`, `OrganizationStatusChanged` events, which `api-users` consumes to provision users, update denormalized data, or manage user statuses.
    *   **Downstream**: `api-organizations` relies on `api-users` for user authentication and authorization checks (via JWTs and guards).
*   **`api-debts`**:
    *   **Upstream**: Publishes `OrganizationStatusChanged` events, which `api-debts` might consume to suspend portfolio operations for a suspended organization.
    *   **Downstream**: `api-organizations` aggregates data from `api-debts` via request-response events for dashboard metrics.
*   **`api-communications`**:
    *   **Upstream**: Publishes various organization-related events (`OrganizationCreated`, `OrganizationStatusChanged`) that `api-communications` consumes to trigger welcome emails, manage communication campaigns, or halt communications.
    *   **Downstream**: `api-organizations` might request aggregated communication metrics from `api-communications` for analytics.
*   **Analytics Module (Internal Orchestration)**: Internally, the analytics module within `api-organizations` acts as an event orchestrator. It publishes request events (e.g., `AnalyticsDashboardSummaryRequested`) and subscribes to response events (e.g., `AnalyticsDashboardSummaryCompleted` from `api-debts`, `api-transactions`, etc.) to build dashboard summaries.

## Conclusion

The `api-organizations` microservice is essential for the multi-tenant architecture of the Verichron platform. Its robust feature set and clear boundaries enable scalable, secure, and compliant management of client organizations, forming a critical backbone for the entire SaaS ecosystem.
