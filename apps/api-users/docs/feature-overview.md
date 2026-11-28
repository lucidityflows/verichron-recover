# API-Users Microservice: Feature Overview and System Context

## Introduction

The `api-users` microservice is the **Identity and Access Management (IAM)** cornerstone of the Verichron SaaS platform. It serves as the authoritative source for all user-related concerns, including who users are, how they authenticate, and what they are permitted to do. Its primary role is to secure the platform and provide a consistent identity foundation for all other microservices.

## Core Features

The `api-users` microservice provides the following high-level capabilities to the platform:

*   **User Identity & Profile Management**: Manages the complete lifecycle of user accounts, including their profiles and associated contact information (emails, addresses, phones).
*   **Secure Multi-Tenant Authentication**: Implements a robust, two-step authentication flow that issues short-lived, scoped JSON Web Tokens (JWTs) for a specific organization context. This ensures a user's session is strictly tied to a single tenant, preventing cross-organization data access.
*   **Context Switching**: Provides a secure mechanism for users who belong to multiple organizations to switch between their organizational contexts without a full logout/login cycle.
*   **Session Management**: Supports secure session management through a standard refresh token mechanism, allowing users to maintain their sessions without frequent re-authentication.
*   **User Invitation & Activation**: Orchestrates a secure workflow for inviting new users to an organization. New users are created in a `PENDING` state and activate their account via a secure, one-time-use token.
*   **Tenant-Scoped Role-Based Access Control (RBAC)**: Manages a flexible RBAC system where roles are defined on a per-organization basis. This allows each tenant to have customized roles while leveraging a common set of platform-wide permissions.
*   **Default Role Provisioning**: Automatically seeds new organizations with a set of default roles (e.g., Organization Admin, Manager, Collector, DEBTOR) to ensure a functional setup out of the box.
*   **Event-Driven User Provisioning**: Automatically provisions the initial administrator user for a new organization by listening to `OrganizationCreated` events, ensuring a decoupled and resilient onboarding process.

## Role in the Monorepo

`api-users` is a foundational service within the Verichron monorepo. It is designed to be a **provider service**, meaning it is a dependency for all other services but does not itself have dependencies on other business-domain microservices. This critical design choice prevents circular dependencies and ensures the stability and independence of the platform's IAM capabilities. It leverages shared packages from the monorepo, such as `@verichron/types` and `@verichron/event-publisher`, to maintain consistency.

## SaaS Ecosystem Interactions

As the central identity provider, `api-users` has numerous critical interactions with other services:

*   **Upstream (Provider Role)**:
    *   **All Other Services**: Every other microservice relies on the JWTs issued by `api-users` to authenticate and authorize incoming requests. They validate the JWT signature and use the embedded permissions and `organizationId` to enforce security.
    *   **API Gateway**: The API gateway forwards user credentials to `api-users` during login and passes JWTs to upstream services for subsequent requests.

*   **Downstream (Event Consumer Role)**:
    *   `api-users` subscribes to events from `api-organizations` to automate user management.
        *   **`OrganizationCreated`**: Triggers the creation of the initial "Organization Admin" user for a new tenant.
        *   **`OrganizationNameChanged`**: Triggers an update to the denormalized `organizationName` in user membership records to optimize login performance.
        *   **`OrganizationSuspended`**: Triggers the suspension of all users within that organization.

## Conclusion

The `api-users` microservice is the bedrock of the Verichron platform's security and multi-tenancy model. By centralizing identity, authentication, and authorization, it provides a secure, robust, and scalable foundation upon which all other services are built. Its event-driven nature and adherence to the "foundational provider" pattern ensure that it is both a stable and highly integrated component of the overall SaaS ecosystem.
