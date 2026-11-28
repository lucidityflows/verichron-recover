# Team Management Architecture

## Overview
The Team Management system provides hierarchical organization support within the Verichron platform. It allows for grouping collectors and managers into teams, enabling team-scoped analytics, work queue filtering, and access control.

---

## Core Concepts

### Organizations and Teams
Teams are scoped to an Organization. A user must belong to an organization before they can be assigned to a team within that organization.

### Multi-Team Membership
The system supports users being members of multiple teams.
*   **Primary Team:** Every user can have one designated "Primary Team" which is used for default UI views and primary reporting.
*   **Team Roles:** Members are assigned roles within a team: `MEMBER`, `LEAD`, or `MANAGER`.

---

## Data Model

### Team Entity (`api-organizations`)
*   `id`: UUID
*   `organizationId`: UUID (Owner)
*   `name`: String (Unique within organization)
*   `description`: String
*   `isActive`: Boolean

### TeamMember Entity (`api-organizations`)
*   `teamId`: UUID
*   `userId`: UUID
*   `role`: TeamMemberRole (Enum)
*   `isPrimary`: Boolean

---

## Security and Access Control

### TeamAccessGuard
A specialized guard used in `api-collectors` to enforce team-scoping.
1.  **Platform Admins:** Bypasses all checks.
2.  **Org Admins/Managers:** Can access all teams within their organization.
3.  **Collectors/Leads:** Can only access teams where they have an active membership.

### Routing Pattern
Standard team-filtered routes follow the pattern:
`GET /orgs/:orgId/[feature]?teamId=[uuid]`

---

## Service-to-Service Integration
Teams are managed in `api-organizations`. Other microservices (like `api-collectors`) query team data via internal endpoints:

*   `GET /internal/teams/verify-membership/:userId/:teamId`
*   `GET /internal/teams/user-primary-team/:organizationId/:userId`
*   `GET /internal/teams/:organizationId/user/:userId`

---

## Implementation Status (as of Dec 2025)

### Phase 1 & 2: Backend (Complete)
*   Full CRUD for Teams and Team Membership in `api-organizations`.
*   Internal Teams Client in `api-collectors`.
*   Team-scoped filtering implemented for Leaderboards, Work Queues, and Analytics Orchestrators.

### Phase 3: UI (Pending)
*   TeamSelector component for switching contexts.
*   Team Management dashboard for Org Admins.
*   OpenAPI/Orval client generation for Teams endpoints.
