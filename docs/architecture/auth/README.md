# Authentication & Authorization Architecture

This section provides a comprehensive overview of the Verichron platform's Identity and Access Management (IAM) system. The architecture is built on a multi-layered, defense-in-depth strategy that is robust, scalable, and secure.

## Table of Contents

- **[1. Core Concepts](./concepts.md)**
  - A high-level overview of design principles, User Types (Platform Admin vs. Organization User), and the Role-Based Access Control (RBAC) model.

- **[2. JWT Structure](./jwt-structure.md)**
  - A detailed breakdown of the JSON Web Token (JWT) structure, including standard claims and the custom claims namespace.

- **[3. Guard Architecture](./guard-architecture.md)**
  - An in-depth explanation of the security pipeline and the three primary guards that protect every endpoint: `JwtAuthGuard`, `OrgContextGuard`, and `PermissionsGuard`.

- **[4. Decorators](./decorators.md)**
  - A reference guide for the custom decorators used to apply security policies, such as `@Permissions`, `@OrganizationId`, and `@Public`.

- **[5. Authentication Flows](./flows/)**
  - Step-by-step explanations of critical user authentication workflows:
    - [**Login Flow**](./flows/login.md): The secure, two-step authentication process.
    - [**Token Refresh**](./flows/token-refresh.md): How user sessions are maintained.
    - [**Context Switching**](./flows/context-switching.md): How multi-organization users switch between tenants.
