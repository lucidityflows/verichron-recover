# Organization Onboarding Protocols

**Document Version**: 1.0
**Last Updated**: 2025-10-30
**Status**: Active - MVP Implementation
**Owner**: Engineering & Product

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [MVP Implementation (Option 3)](#mvp-implementation-option-3)
4. [Current Onboarding Workflows](#current-onboarding-workflows)
5. [Future Evolution (Option 4)](#future-evolution-option-4)
6. [Business Impact Analysis](#business-impact-analysis)
7. [Technical Architecture](#technical-architecture)
8. [Decision Rationale](#decision-rationale)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

This document defines the organization onboarding protocols for our debt collection SaaS platform, outlining how new customer organizations are provisioned and how we will scale from manual onboarding to self-service registration.

**Current State (MVP - Option 3):**
- Platform Admin-driven onboarding
- Event-driven architecture with clear separation of concerns
- Two distinct event types for different creation workflows
- Manual, high-touch customer onboarding process

**Future State (Post-MVP - Option 4):**
- Self-service registration portal
- Automated trial provisioning
- Payment integration
- Streamlined alpha/beta customer acquisition

---

## Business Context

### What is an "Organization"?

In our platform, an **Organization** represents a **customer company** - the debt collection agencies, creditors, or partners who subscribe to our SaaS platform. Each organization is a **tenant** with complete data isolation, their own users, roles, portfolios, and settings.

### Alpha Customer Strategy

**Pre-MVP Reality:**
- We are building an enterprise-grade debt collection SaaS platform
- Early customers will be recruited through direct sales, partnerships, and referrals
- Initial customers require high-touch onboarding with consultation and training
- We need to validate product-market fit before opening self-service registration

**Post-MVP Goal:**
- Enable prospects to self-register and start a trial immediately
- Reduce sales cycle from weeks to minutes for qualified prospects
- Scale customer acquisition without scaling headcount linearly
- Competitive advantage through frictionless onboarding

---

## MVP Implementation (Option 3)

### Overview

The MVP uses a **Platform Admin-Driven Onboarding** model with **event-driven provisioning**. This approach provides maximum control, quality assurance, and customer support during the critical early adoption phase.

### What Option 3 Does

✅ **Platform Admin Dashboard Workflow:**
1. Customer signs contract (offline process)
2. Platform Admin logs into admin dashboard
3. Admin navigates to onboarding section
4. Admin fills out organization details:
   - Organization name
   - Organization type (COLLECTION_AGENCY, CREDITOR, PARTNER)
   - Tax ID, address, contact information
   - Initial admin user details (email, first name, last name)
5. Admin submits the onboarding request

✅ **System Automation:**
1. `POST /onboarding` endpoint creates organization with `PROVISIONING` status
2. Publishes `OrganizationCreated` event with full admin user details
3. `api-users` microservice receives event
4. `api-users` creates admin user with `PENDING` status
5. `api-users` assigns `ORG_ADMIN` role to the user
6. `api-users` sends invitation email to admin user
7. Organization status changes to `ACTIVE`
8. Platform Admin receives confirmation

✅ **Admin User Activation:**
1. New admin receives invitation email with secure token
2. Admin clicks invitation link
3. Admin sets their password
4. Admin account status changes to `ACTIVE`
5. Admin can now log in to their tenant
6. Admin can invite additional users to their organization

✅ **Event Architecture:**
```typescript
// Primary onboarding event (published by OnboardingService)
OrganizationCreatedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  adminUser: {  // Required - always provision admin
    email: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: string;  // Platform admin who initiated onboarding
}

// Utility CRUD event (published by ProfilesService)
OrganizationProfileCreatedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  createdBy: string;  // Platform admin who created entity
}
```

### What Option 3 Does NOT Do

❌ **No Public Self-Service:**
- No public registration endpoint
- No "Sign Up" button on marketing website
- Prospects cannot create their own organizations
- All onboarding is gated through Platform Admins

❌ **No Automated Trials:**
- No trial period management
- No automated trial-to-paid conversion
- No trial limitations or feature gating
- Organizations are either fully active or inactive

❌ **No Payment Integration:**
- No credit card collection during onboarding
- No Stripe/payment provider integration
- No subscription billing automation
- Payment handled through traditional invoicing (offline)

❌ **No Self-Service Verification:**
- No email verification flow for prospects
- No automated identity verification
- No automated business verification
- All vetting done during sales process

❌ **No Provisional Access:**
- Organizations are created as fully active tenants
- No "pending approval" or "restricted trial" modes
- No temporary access limitations

### Business Capabilities

**What This Enables:**

1. **High-Touch Onboarding:**
   - Personal consultation during setup
   - Custom configuration guidance
   - Training sessions for admin users
   - Direct support channel established

2. **Quality Control:**
   - Manual vetting of all customers
   - Verification of business legitimacy
   - Compliance review before activation
   - Financial qualification assessment

3. **Strategic Partnerships:**
   - White-glove service for enterprise customers
   - Custom SLA negotiation before onboarding
   - Opportunity for custom feature discussion
   - Relationship building from day one

4. **Data Quality:**
   - Accurate organization information
   - Verified contact details
   - Proper business classification
   - Clean customer database from start

### Timeline Expectations

**Customer Perspective:**
- Contract signing → Admin receives invitation: **Same day** (minutes to hours)
- Admin activates account: **1-3 days** (depends on admin response)
- First login to full productivity: **Same day** (immediate access upon activation)

**Platform Admin Workload:**
- Time per onboarding: **5-10 minutes**
- Can onboard multiple customers per day
- Scalable to ~50-100 customers before automation becomes critical

---

## Current Onboarding Workflows

### Workflow 1: Standard Customer Onboarding (Primary Use Case)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Sales Process (Offline)                        │
│ - Demo & discovery calls                               │
│ - Proposal & pricing negotiation                       │
│ - Contract execution                                   │
│ - Implementation planning                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Platform Admin Onboarding                      │
│                                                         │
│ Platform Admin → Admin Dashboard                        │
│      ↓                                                  │
│ POST /onboarding                                        │
│   {                                                     │
│     organization: {                                     │
│       name: "Acme Collection Agency",                   │
│       type: "COLLECTION_AGENCY",                        │
│       taxId: "12-3456789",                              │
│       settings: { ...default config... }                │
│     },                                                  │
│     adminUser: {                                        │
│       email: "john.doe@acmecollections.com",            │
│       firstName: "John",                                │
│       lastName: "Doe"                                   │
│     }                                                   │
│   }                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 3: System Processing (Async Event-Driven)         │
│                                                         │
│ api-organizations:                                      │
│   1. Creates organization (status: PROVISIONING)        │
│   2. Publishes OrganizationCreated event               │
│   3. Updates status to ACTIVE                           │
│                                                         │
│ GCP Pub/Sub: Event Routing                             │
│                                                         │
│ api-users:                                              │
│   1. Receives OrganizationCreated event                 │
│   2. Creates user (status: PENDING)                     │
│   3. Assigns ORG_ADMIN role                             │
│   4. Generates invitation token (24hr expiry)           │
│   5. Publishes UserCreated event                        │
│                                                         │
│ api-communications:                                     │
│   1. Receives UserCreated event                         │
│   2. Sends invitation email to admin                    │
│   3. Sends welcome email to admin                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Admin User Activation                          │
│                                                         │
│ Admin receives email → Clicks invitation link           │
│      ↓                                                  │
│ POST /users/{userId}/activate                           │
│   {                                                     │
│     invitationToken: "...",                             │
│     password: "SecurePassword123!"                      │
│   }                                                     │
│      ↓                                                  │
│ api-users:                                              │
│   1. Validates token                                    │
│   2. Hashes password (bcrypt)                           │
│   3. Updates user status to ACTIVE                      │
│   4. Publishes UserActivated event                      │
│      ↓                                                  │
│ Admin can now login → Full ORG_ADMIN access             │
└─────────────────────────────────────────────────────────┘
```

**Duration:** Minutes (automated) + User response time

### Workflow 2: Platform Admin Creates Org Shell (Utility)

```
┌─────────────────────────────────────────────────────────┐
│ USE CASE: Create org entity for testing/migration      │
│                                                         │
│ Platform Admin → POST /orgs                             │
│   {                                                     │
│     name: "Test Organization",                          │
│     type: "COLLECTION_AGENCY",                          │
│     status: "PROVISIONING"                              │
│   }                                                     │
│      ↓                                                  │
│ api-organizations:                                      │
│   1. Creates organization                               │
│   2. Publishes OrganizationProfileCreated event         │
│   3. NO admin user provisioning                         │
│                                                         │
│ api-users:                                              │
│   - Does NOT subscribe to this event                    │
│   - No user creation                                    │
│                                                         │
│ RESULT: Org shell exists, no users                     │
└─────────────────────────────────────────────────────────┘
```

**Use Cases:**
- Testing environments
- Data migration preparation
- Pre-staging organizations before sales closure
- Administrative cleanup operations

**Important:** This is NOT the primary onboarding flow. Users must be manually invited after org creation.

---

## Future Evolution (Option 4)

### Overview

**Option 4** represents the **Self-Service Registration Portal** - a fully automated onboarding system that allows prospects to provision their own trial organizations without Platform Admin intervention.

### Trigger for Evolution

We will implement Option 4 when:
1. ✅ Option 3 is stable and battle-tested (3+ months in production)
2. ✅ All 6 microservices are integrated and tested
3. ✅ We have 20-50 successful customer onboardings through Option 3
4. ✅ Customer acquisition demand exceeds manual onboarding capacity
5. ✅ Payment provider integration is complete
6. ✅ Legal/compliance review of self-service terms is complete

**Estimated Timeline:** 3-6 months post-MVP launch

### What Option 4 Adds

✅ **Public Self-Service Registration:**
```
Marketing Website → "Start Free Trial" Button
    ↓
POST /public/register (no authentication required)
    ↓
{
  organization: {
    name: "Acme Collections",
    type: "COLLECTION_AGENCY",
    taxId: "12-3456789",
    address: {...},
    phoneNumber: {...}
  },
  adminUser: {
    email: "john@acme.com",
    firstName: "John",
    lastName: "Doe",
    password: "SecurePassword123!"
  },
  verification: {
    captchaToken: "...",
    termsAccepted: true,
    privacyPolicyAccepted: true
  },
  trial: {
    duration: 30  // days
  }
}
```

✅ **Automated Trial Management:**
- Organizations created with `TRIAL` status
- Trial expiration tracking (30/60/90 days)
- Feature limitations during trial:
  - Max 5 users
  - Max 100 debts
  - Max 10 portfolios
  - No API access
  - Watermarked reports
- Automated expiration warnings (7 days, 3 days, 1 day before)
- Auto-suspension on trial expiration

✅ **Email Verification Flow:**
```
User submits registration
    ↓
System creates user with PENDING_VERIFICATION status
    ↓
Sends verification email with 24hr token
    ↓
User clicks verification link
    ↓
User status → ACTIVE
Organization status → TRIAL (active)
```

✅ **Payment Integration:**
- Stripe/payment provider integration
- Credit card collection (not charged during trial)
- Automated trial-to-paid conversion
- Subscription billing (monthly/annual)
- Invoice generation
- Payment failure handling
- Dunning management

✅ **Identity Verification:**
- Email domain verification
- Phone number verification (SMS)
- Business verification (optional):
  - Tax ID validation
  - DUNS number lookup
  - Chamber of Commerce verification
- Anti-fraud checks:
  - Duplicate detection
  - IP geolocation
  - Disposable email detection

✅ **Progressive Provisioning:**
```
Registration → Email Verification (minutes)
    ↓
Provisional Access (limited trial)
    ↓
Business Verification (optional, 1-3 days)
    ↓
Full Trial Access
    ↓
Payment Method Added
    ↓
Trial Expiration → Convert to Paid
    ↓
Full Production Access
```

✅ **Self-Service Dashboard:**
- Trial status visibility
- Usage metrics (users, debts, API calls)
- Upgrade prompts
- Payment method management
- Invoice history
- Feature comparison (trial vs paid)

### What Option 4 Changes

**Event Architecture:** *(Same events, different context)*
- `OrganizationCreated` event still published
- Same admin user provisioning flow
- Additional fields:
  ```typescript
  {
    trialStatus?: {
      isTrial: boolean;
      expiresAt: string;
      limitations: TrialLimitations;
    };
    verificationStatus?: {
      emailVerified: boolean;
      phoneVerified: boolean;
      businessVerified: boolean;
    };
    subscriptionStatus?: {
      plan: 'trial' | 'starter' | 'professional' | 'enterprise';
      billingCycle: 'monthly' | 'annual';
      nextBillingDate?: string;
    }
  }
  ```

**New Microservice Requirements:**
- `api-billing`: Handles subscriptions, invoices, payment processing
- `api-verification`: Handles identity and business verification

**Database Schema Changes:**
- Organizations table: Add `trial_expires_at`, `subscription_tier`, `payment_status`
- New table: `subscriptions` (billing records)
- New table: `payment_methods` (tokenized card data)
- New table: `invoices`

### Capabilities Unlocked by Option 4

1. **Viral Growth:**
   - Prospects can try immediately (no sales call required)
   - Word-of-mouth converts to trials instantly
   - Conference/webinar attendees can sign up on the spot

2. **Lead Qualification:**
   - Engaged trial users are qualified leads
   - Usage data informs sales prioritization
   - Automated lead scoring based on activity

3. **Faster Sales Cycle:**
   - Prospects experience product before talking to sales
   - Demos become consultative (they've already used it)
   - Pricing conversations happen after value is proven

4. **Market Expansion:**
   - Small agencies that can't afford sales process
   - International customers (no timezone barriers)
   - Adjacent markets (creditors, law firms)

5. **Competitive Positioning:**
   - Modern, friction-free onboarding
   - Demonstrates platform maturity
   - Reduces perceived risk for prospects

### Implementation Effort

**Estimated Effort:** 2-3 weeks (1 sprint)

**Development Breakdown:**
- Public registration endpoint: 2 days
- Email verification system: 2 days
- Trial management system: 3 days
- Payment provider integration: 3 days
- Verification workflows: 2 days
- Anti-fraud measures: 2 days
- Self-service dashboard: 3 days
- Testing & QA: 3 days

**Dependencies:**
- Payment provider account (Stripe recommended)
- Email service provider with verification templates
- SMS provider for phone verification (Twilio recommended)
- Legal review of terms of service
- CAPTCHA provider (reCAPTCHA v3)
- Fraud detection service (optional, Sift recommended)

---

## Business Impact Analysis

### Option 3 (MVP) - Platform Admin Onboarding

**Pros:**
- ✅ **Quality Control:** Manual vetting ensures legitimate customers
- ✅ **High Touch:** Personal relationships with early customers
- ✅ **Fast to Market:** Simple implementation, low technical risk
- ✅ **Data Quality:** Accurate information from day one
- ✅ **Pricing Flexibility:** Custom pricing for enterprise customers
- ✅ **Low Fraud Risk:** No automated signups to abuse
- ✅ **Compliance:** Easier to ensure regulatory compliance

**Cons:**
- ❌ **Scalability:** Limited by Platform Admin availability
- ❌ **Response Time:** Prospects must wait for admin to onboard
- ❌ **Opportunity Cost:** Lose prospects who want instant access
- ❌ **Competitive Disadvantage:** Competitors with self-service win faster
- ❌ **Geographic Limitations:** Time zones limit 24/7 onboarding
- ❌ **Seasonal Bottlenecks:** Holiday/vacation coverage gaps

**Ideal Customer Profile:**
- Enterprise debt collection agencies (100+ employees)
- Strategic partnerships requiring negotiation
- Customers requiring custom compliance configurations
- High-value contracts ($50k+ annual)
- Complex implementation requirements

**Capacity:**
- 1 Platform Admin can onboard: **10-20 orgs/week**
- Assuming 5-10 minutes per onboarding
- Bottleneck: Admin availability, not system capacity

### Option 4 (Future) - Self-Service Registration

**Pros:**
- ✅ **24/7 Onboarding:** No human in the loop
- ✅ **Instant Gratification:** Prospects try product immediately
- ✅ **Viral Growth:** Lower barrier to adoption
- ✅ **Market Expansion:** Reach SMB segment
- ✅ **Competitive Parity:** Match modern SaaS expectations
- ✅ **Global Reach:** No timezone limitations
- ✅ **Lead Generation:** More top-of-funnel prospects

**Cons:**
- ❌ **Lower Quality:** More tire-kickers and unqualified leads
- ❌ **Fraud Risk:** Automated abuse potential
- ❌ **Support Load:** More customers need help
- ❌ **Payment Complexity:** Churn, failed payments, disputes
- ❌ **Implementation Cost:** 2-3 weeks development
- ❌ **Compliance Risk:** Self-service requires stronger legal protection

**Ideal Customer Profile:**
- Small-medium agencies (5-50 employees)
- Solo collection practitioners
- Creditors managing own collections
- Law firms with collection practices
- International customers
- Price-sensitive buyers

**Capacity:**
- System capacity: **Unlimited** (infrastructure auto-scales)
- Support capacity becomes bottleneck (not onboarding)

### Financial Impact

**Option 3 Revenue Projections (Year 1):**
- Target: 50 customers
- Average Contract Value (ACV): $50,000
- Total Revenue: $2.5M
- Acquisition Cost: $5,000/customer (sales-driven)
- CAC Payback: 1.2 months

**Option 4 Revenue Projections (Year 1):**
- Target: 500 trial signups
- Conversion Rate: 20% (trial → paid)
- Paying Customers: 100
- Average ACV: $20,000 (smaller customers)
- Total Revenue: $2M
- Acquisition Cost: $500/customer (marketing-driven)
- CAC Payback: 0.3 months

**Combined Strategy (Recommended):**
- Option 3: 50 enterprise customers = $2.5M
- Option 4: 100 SMB customers = $2M
- **Total Year 1: $4.5M**
- Market coverage: Enterprise + SMB segments

---

## Technical Architecture

### Event-Driven Onboarding (Option 3)

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

### Database Schema (Option 3)

```sql
-- organizations_db (api-organizations)
organizations
  id                    UUID PRIMARY KEY
  name                  VARCHAR(255) NOT NULL
  display_name          VARCHAR(255)
  organization_type     VARCHAR(50) NOT NULL  -- AGENCY, CREDITOR, PARTNER
  parent_organization_id UUID REFERENCES organizations(id)
  tax_id                VARCHAR(50)
  status                VARCHAR(50) NOT NULL  -- PROVISIONING, ACTIVE, SUSPENDED, INACTIVE
  settings              JSONB
  created_at            TIMESTAMP NOT NULL
  updated_at            TIMESTAMP NOT NULL

-- users_db (api-users)
users
  id                    UUID PRIMARY KEY
  first_name            VARCHAR(100) NOT NULL
  last_name             VARCHAR(100) NOT NULL
  email                 VARCHAR(255) NOT NULL UNIQUE
  password_hash         VARCHAR(255)
  status                VARCHAR(50) NOT NULL  -- PENDING, ACTIVE, SUSPENDED, INACTIVE
  invitation_token      VARCHAR(255) UNIQUE
  invitation_expires_at TIMESTAMP
  created_at            TIMESTAMP NOT NULL
  updated_at            TIMESTAMP NOT NULL

user_memberships
  user_id               UUID REFERENCES users(id)
  organization_id       UUID  -- References api-organizations (no FK)
  organization_name     VARCHAR(255)  -- Denormalized for performance
  role_id               UUID REFERENCES roles(id)
  created_at            TIMESTAMP NOT NULL
  PRIMARY KEY (user_id, organization_id)
```

### API Endpoints (Option 3)

**Platform Admin Only:**
```http
POST /onboarding
Authorization: Bearer <platform-admin-jwt>
Content-Type: application/json

{
  "organization": {
    "name": "Acme Collection Agency",
    "displayName": "Acme Collections",
    "organizationType": "COLLECTION_AGENCY",
    "taxId": "12-3456789",
    "settings": {
      "branding": {
        "logo_url": "https://cdn.acme.com/logo.png",
        "primary_color_hex": "#1E40AF"
      },
      "compliance": {
        "fdcpa_strict_mode": true,
        "record_all_calls": true
      }
    }
  },
  "initialAdmin": {
    "email": "john.doe@acmecollections.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}

Response (201 Created):
{
  "orgId": "123e4567-e89b-12d3-a456-426614174000",
  "orgName": "Acme Collection Agency",
  "adminUserId": "pending-async-provisioning",
  "adminEmail": "john.doe@acmecollections.com",
  "message": "Organization successfully created. Admin user provisioning initiated asynchronously.",
  "createdAt": "2025-10-30T10:30:00.000Z"
}
```

**User Activation (Public):**
```http
POST /users/{userId}/activate
Content-Type: application/json

{
  "invitationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePassword123!"
}

Response (200 OK):
{
  "userId": "user-uuid",
  "email": "john.doe@acmecollections.com",
  "status": "ACTIVE",
  "message": "Account activated successfully. You can now log in."
}
```

---

## Decision Rationale

### Why Option 3 for MVP?

1. **Risk Mitigation:**
   - Proven architecture (similar to Slack, GitHub, Salesforce early days)
   - No payment provider dependencies
   - Lower security surface area
   - Easier compliance management

2. **Customer Quality:**
   - Every customer is vetted and committed
   - Higher revenue per customer
   - Better retention (no trial churn)
   - Stronger customer relationships

3. **Technical Simplicity:**
   - Event-driven architecture is battle-tested
   - No new infrastructure required
   - Minimal external dependencies
   - Clear separation of concerns

4. **Business Alignment:**
   - Enterprise SaaS traditionally uses high-touch onboarding
   - Debt collection is regulated industry (manual vetting is advantage)
   - Early customers need consultation, not self-service
   - Time to market is critical (Option 3 is faster to implement)

### Why Save Option 4 for Later?

1. **Validation First:**
   - Need to prove product-market fit before scaling acquisition
   - Early customers provide product feedback
   - Pricing model needs validation
   - Support playbooks need development

2. **Technical Maturity:**
   - All 6 microservices need integration testing
   - Event-driven system needs production hardening
   - Infrastructure auto-scaling needs validation
   - Monitoring and alerting needs establishment

3. **Legal/Compliance:**
   - Terms of service need legal review
   - Privacy policy needs finalization
   - Compliance framework needs completion
   - Fraud prevention needs implementation

4. **Resource Allocation:**
   - 2-3 weeks for Option 4 is significant
   - Those weeks better spent on core features
   - Payment integration can happen in parallel later
   - Marketing website needs completion first

---

## Success Metrics

### Option 3 (MVP) KPIs

**Onboarding Metrics:**
- Time to onboard (target: < 10 minutes)
- Onboarding success rate (target: 100%)
- Admin activation rate (target: > 90% within 48 hours)
- Time to first login (target: < 24 hours from invitation)

**Quality Metrics:**
- Data accuracy (target: 100% - manual entry is accurate)
- Customer support tickets per onboarding (target: < 0.5)
- Provisioning failures (target: 0%)

**Business Metrics:**
- Customers onboarded per month (baseline)
- Average contract value (target: $50k+)
- Customer satisfaction with onboarding (target: 9/10)
- Time from contract to productive use (target: < 1 week)

### Option 4 (Future) KPIs

**Conversion Funnel:**
- Trial signups per month (target: 100+)
- Activation rate (email verified) (target: 70%)
- Trial engagement rate (used core features) (target: 50%)
- Trial-to-paid conversion (target: 20%)
- Time to conversion (target: < 20 days)

**Growth Metrics:**
- Month-over-month signup growth (target: 20%)
- Geographic expansion (target: 3+ countries)
- Customer acquisition cost (target: < $500)
- CAC payback period (target: < 3 months)

**Quality Metrics:**
- Fraud rate (target: < 1%)
- Payment failure rate (target: < 5%)
- Churn rate (target: < 10% annually)
- Support tickets per customer (target: < 2 per quarter)

---

## Appendix: Frequently Asked Questions

### Can we do a hybrid approach?

Yes! After Option 3 is stable, we can add a lightweight "Register Interest" form:
- Public form collects org + admin details
- Creates org with `PENDING_APPROVAL` status
- Platform Admin reviews and approves
- Approval triggers standard onboarding flow
- Captures alpha customers without full self-service infrastructure

### What about partner onboarding?

Partners (integrations, data providers) follow the same Option 3 flow initially. Post-MVP, we can create a dedicated partner onboarding workflow with:
- API key generation
- Webhook configuration
- Sandbox environment access
- Partner-specific role assignments

### How do we handle multi-organization users (consultants)?

Option 3 supports this through the `user_memberships` table:
- Same user can have memberships in multiple organizations
- Each membership has its own role
- JWT is scoped to one organization at a time
- Context switching via `/auth/switch-context` endpoint

### What about organization hierarchies (parent/child)?

The schema supports this via `parent_organization_id`. Use cases:
- National agency with regional offices
- Creditor with multiple subsidiaries
- White-label provider with clients

Implementation details in post-MVP phase.

---

**Document Status**: Ready for implementation
**Next Steps**: Proceed with Option 3 implementation (remove event from ProfilesService, test onboarding flow)
**Review Cycle**: Quarterly review after MVP launch to assess Option 4 readiness
