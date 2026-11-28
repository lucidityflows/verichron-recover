# Organization Onboarding Protocols

This document defines the organization onboarding protocols for the Verichron platform, outlining how new customer organizations are provisioned and the strategic evolution from manual to self-service registration.

---

## 1. Executive Summary

-   **Current State (MVP - Option 3)**: Platform Admin-driven onboarding with an event-driven provisioning architecture. This ensures control, quality assurance, and high-touch support for early customers.
-   **Future State (Post-MVP - Option 4)**: Evolution towards a self-service registration portal with automated trial provisioning and payment integration.

## 2. Business Context

An **Organization** in our platform represents a **customer company** (debt collection agencies, creditors, partners). Each organization is a **tenant** with complete data isolation, its own users, roles, portfolios, and settings.

### Alpha Customer Strategy (MVP)
Our strategy for early customers involves high-touch onboarding with consultation and training. This prioritizes validating product-market fit before enabling self-service.

### Post-MVP Goal
To enable prospects to self-register for trials, reducing the sales cycle and scaling customer acquisition without linear headcount growth.

---

## 3. MVP Implementation (Option 3): Platform Admin-Driven Onboarding

The MVP leverages a **Platform Admin-Driven Onboarding** model with **event-driven provisioning**.

### Workflow Overview

1.  **Sales Process (Offline)**: Customer signs a contract.
2.  **Platform Admin Onboarding**:
    -   Platform Admin logs into an admin dashboard.
    -   Admin fills out organization details (name, type, tax ID, initial admin user details).
    -   Admin submits the onboarding request via a `POST /onboarding` API call to `api-organizations`.
3.  **System Processing (Async Event-Driven)**:
    -   `api-organizations` creates the organization (initially `PROVISIONING` status), publishes an `OrganizationCreated` event, and then updates its status to `ACTIVE`.
    -   `api-users` receives the `OrganizationCreated` event, creates the initial admin user (with `PENDING` status), assigns an `ORG_ADMIN` role, generates an invitation token, and publishes a `UserCreated` event.
    -   `api-communications` receives the `UserCreated` event and sends an invitation email to the admin.
4.  **Admin User Activation**:
    -   The new admin receives the invitation email, clicks the link, sets their password via `POST /users/{userId}/activate`.
    -   `api-users` activates the account (status `ACTIVE`), consumes the token, and publishes a `UserActivated` event.
    -   The admin can now log in to their tenant.

### Key Characteristics of MVP Implementation

-   **No Public Self-Service**: All onboarding is gated through Platform Admins.
-   **No Automated Trials**: Organizations are fully active, not trial-limited.
-   **No Payment Integration**: Payment handled through traditional invoicing.
-   **High-Touch Onboarding**: Personal consultation, custom configuration, direct support.
-   **Quality Control**: Manual vetting of customers ensures legitimacy and compliance.

### Technical Architecture (MVP - Option 3)

#### Event-Driven Onboarding Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   api-organizations                         │
│                                                             │
│  POST /onboarding                                           │
│       ↓                                                     │
│  OnboardingService.provisionOrganization()                  │
│       ↓                                                     │
│  1. Create Organization (status: PROVISIONING)              │
│  2. Save to organizations_db                                │
│  3. Publish Event ──────────────────┐                       │
│  4. Update status to ACTIVE         │                       │
└─────────────────────────────────────┼───────────────────────┘
                                      │
                                      │ GCP Pub/Sub
                                      │ Topic: organizations-v1
                                      │ Event: organizations.organization.created
                                      │
                                      ↓
                    ┌─────────────────────────────────────────┐
                    │        Event: OrganizationCreated       │
                    │  {                                      │
                    │    organizationId: "org-123",           │
                    │    organizationName: "Acme Corp",       │
                    │    organizationType: "AGENCY",          │
                    │    adminUser: {                         │
                    │      email: "admin@acme.com",           │
                    │      firstName: "John",                 │
                    │      lastName: "Doe"                    │
                    │    },                                   │
                    │    createdBy: "platform-admin-uuid"     │
                    │  }                                      │
                    └────────┬─────────────────┬──────────────┘
                             │                 │
                ┌────────────▼────────┐   ┌────▼───────────────┐
                │     api-users       │   │ api-communications │
                │                     │   │                    │
                │ Listener:           │   │ Listener:          │
                │ OrganizationCreated │   │ OrganizationCreated│
                │       ↓             │   │       ↓            │
                │ 1. Create User      │   │ 1. Send welcome    │
                │    (PENDING)        │   │    email           │
                │ 2. Assign ORG_ADMIN │   │ 2. Send invitation │
                │ 3. Generate token   │   │    email           │
                │ 4. Publish          │   │ 3. Create          │
                │    UserCreated      │   │    onboarding      │
                │    event            │   │    campaign        │
                └─────────────────────┘   └────────────────────┘
```

#### Database Schema (Key Entities)

-   **`organizations` table (in `api-organizations`'s `organizations_db`)**: Stores organization details, status (`PROVISIONING`, `ACTIVE`, `SUSPENDED`, `INACTIVE`), and metadata.
-   **`users` table (in `api-users`'s `users_db`)**: Stores user profiles, hashed passwords, status (`PENDING`, `ACTIVE`), and invitation tokens.
-   **`user_memberships` table (in `api-users`'s `users_db`)**: Links users to organizations and specifies their role within that organization. Includes a denormalized `organization_name`.

#### Key API Endpoints

-   **`POST /onboarding` (api-organizations)**: Platform Admin-only endpoint to initiate organization provisioning.
-   **`POST /users/{userId}/activate` (api-users)**: Public endpoint for users to activate their account using an invitation token.

---

## 4. Future Evolution (Option 4): Self-Service Registration Portal

Option 4 envisions a fully automated onboarding system allowing prospects to provision their own trial organizations.

### Trigger for Evolution
Implementation will occur when MVP is stable, all microservices are integrated, customer acquisition demands exceed manual capacity, and payment integration/legal reviews are complete.

### What Option 4 Adds

-   **Public Self-Service Registration**: Prospects can register directly via a public endpoint (`/public/register`).
-   **Automated Trial Management**: Organizations are created with `TRIAL` status, with expiration tracking and feature limitations.
-   **Email Verification Flow**: Automated verification emails with tokens for account activation.
-   **Payment Integration**: Credit card collection, automated trial-to-paid conversion, subscription billing.
-   **Identity Verification**: Automated email, phone, and business verification (Tax ID, DUNS).
-   **Progressive Provisioning**: Multi-stage onboarding from registration to full production access.

---

## 5. Decision Rationale (MVP)

### Why Option 3 for MVP?
-   **Risk Mitigation**: Uses proven architecture, no payment provider dependencies, lower security surface.
-   **Customer Quality**: Ensures legitimate, vetted customers with high-touch support.
-   **Technical Simplicity**: Event-driven architecture is robust, minimal new infrastructure.
-   **Business Alignment**: Suits enterprise SaaS and regulated industries; critical for validating product-market fit.

### Why Save Option 4 for Later?
-   **Validation First**: Need to prove product-market fit and validate the core platform before scaling acquisition.
-   **Technical Maturity**: Requires all microservices to be integrated, production-hardened, and auto-scaling.
-   **Compliance & Resources**: Significant legal, compliance, and development resources are required.

---

## 6. Success Metrics

### Option 3 (MVP) KPIs
-   **Onboarding**: Time to onboard (< 10 minutes), 100% success rate, > 90% admin activation rate.
-   **Quality**: High data accuracy, low support tickets per onboarding.
-   **Business**: Customers onboarded per month, Average Contract Value ($50k+), customer satisfaction.

### Option 4 (Future) KPIs
-   **Conversion Funnel**: Trial signups, activation, engagement, trial-to-paid conversion rates.
-   **Growth**: Month-over-month signup growth, geographic expansion, lower Customer Acquisition Cost (CAC).
-   **Quality**: Low fraud rate, payment failure rate, churn rate.
