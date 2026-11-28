# API-Communications Microservice: Architectural Overview

This document provides a detailed overview of the `api-communications` microservice's internal architecture, its module structure, and its dual-database data model.

---

## Architecture

The `api-communications` service is organized into **6 feature modules**:

### 1. **Dispatch Module** (`src/dispatch/`)
**Purpose**: Orchestrates the sending of communications in response to events.

**Responsibilities**:
- Subscribing to events from other microservices via event processors
- Enforcing compliance rules before sending
- Fetching and rendering templates with context data
- Calling the gateways module to dispatch messages
- Creating initial `CommunicationLog` records
- Publishing dispatch status events

**Key Files**:
- `dispatch.service.ts` - Core orchestration logic with retry handling
- `dispatch.controller.ts` - Manual resend and manual dispatch endpoints
- `processors/payment.processor.ts` - Handles payment-related events
- `processors/user.processor.ts` - Handles user lifecycle events
- `processors/debt.processor.ts` - Handles debt-related events
- `dto/dispatch-request.dto.ts` - Request validation
- `errors/` - Custom exceptions

**Event Processors**:
Each processor handles a specific domain of events:
- **PaymentEventProcessor**: `TransactionSucceeded`, `TransactionFailed`, `PaymentPlanActivated`
- **UserEventProcessor**: `UserCreated`, `UserActivated`
- **DebtEventProcessor**: `DebtStatusChanged`, `DebtorInformationReceived`

**API Endpoints**:
- `POST /dispatch/resend/:logId` - Manually resend a previously failed communication
- `POST /dispatch/manual` - Manually trigger a communication (ops/admin use)

**Design Notes**:
- Event-driven by design - most workflows enter through event processors
- Implements retry logic with exponential backoff for transient gateway failures
- Fail-fast on compliance violations (non-retryable)
- Comprehensive error handling with dead letter queue support

---

### 2. **Templates Module** (`src/templates/`)
**Purpose**: Manages the content and structure of all communication templates.

**Responsibilities**:
- Template CRUD operations (Email, SMS, Letter templates)
- Template versioning (immutable versions for audit trail)
- Syntax validation using Handlebars
- Template preview with test context
- Tenant-scoped template management

**Key Files**:
- `templates.service.ts` - Business logic for CRUD and versioning
- `templates.controller.ts` - REST endpoints
- `template-renderer.service.ts` - Handlebars rendering engine with custom helpers
- `entities/template.entity.ts` - PostgreSQL entity
- `dto/` - Request/response DTOs
- `errors/` - Custom exceptions

**Template Entity** (PostgreSQL):
```typescript
{
  id: UUID
  organizationId: UUID
  name: string
  type: 'EMAIL' | 'SMS' | 'LETTER'
  subject?: string  // For email only
  body: string      // HTML for email, plain text for SMS
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Template Rendering**:
- Uses Handlebars for variable substitution
- Custom helpers: `{{currency amount}}`, `{{formatDate date}}`, `{{debtStatus status}}`
- Context validation before rendering
- Syntax validation on template creation/update

**API Endpoints**:
- `GET /templates` - List templates (organization-scoped, paginated)
- `GET /templates/:id` - Get specific template version
- `POST /templates` - Create new template
- `PUT /templates/:id` - Update template (creates new version)
- `DELETE /templates/:id` - Soft delete (mark inactive)
- `POST /templates/:id/preview` - Preview rendered template with test context

**Design Notes**:
- Templates are versioned immutably - updates create new versions
- Syntax validation occurs before saving to prevent runtime errors
- Each organization has isolated templates (tenant-scoped)

---

### 3. **Logs Module** (`src/logs/`)
**Purpose**: Provides an immutable audit trail of all communications.

**Responsibilities**:
- Storing every communication attempt in MongoDB
- Handling webhook status updates from gateways
- Providing query capabilities for communication history
- Maintaining append-only status history
- Supporting compliance audits

**Key Files**:
- `logs.service.ts` - Business logic for log creation and updates
- `logs.controller.ts` - REST endpoints for querying logs
- `schemas/communication-log.schema.ts` - Mongoose schema
- `dto/query-logs.dto.ts` - Query parameters with pagination
- `errors/` - Custom exceptions

**CommunicationLog Schema** (MongoDB):
```typescript
{
  _id: ObjectId
  organizationId: string
  debtorId: string
  debtId?: string
  type: 'EMAIL' | 'SMS' | 'LETTER'
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED' | 'BLOCKED'
  provider?: string         // 'sendgrid', 'twilio'
  providerMessageId?: string
  templateId?: string
  templateName?: string
  content?: {
    subject?: string
    body: string
  }
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  blockedReason?: string
  failureReason?: string
  statusHistory: Array<{
    status: string
    timestamp: Date
    metadata?: any
  }>
  metadata?: any
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ organizationId: 1, debtorId: 1, sentAt: -1 }` - Debtor communication history
- `{ providerMessageId: 1 }` - Webhook lookups
- `{ status: 1, sentAt: -1 }` - Status-based queries

**API Endpoints**:
- `GET /logs` - Query logs (filterable by debtor, debt, status, type, date range)
- `GET /logs/:id` - Get specific log entry with full status history

**Design Notes**:
- Append-only architecture for tamper-evident audit trail
- Status updates append to `statusHistory` array (never overwrite)
- MongoDB chosen for write scalability and flexible schema
- Indexed for common query patterns (debtor history, status tracking)

---

### 4. **Gateways Module** (`src/gateways/`)
**Purpose**: Abstracts third-party communication provider integrations.

**Responsibilities**:
- Unified interface for email and SMS providers
- Provider-specific implementations (SendGrid, Twilio)
- Webhook signature verification
- Webhook event processing and log updates
- Gateway failover and retry logic
- Mock implementations for testing

**Key Files**:
- `gateway-factory.service.ts` - Factory pattern for provider selection
- `interfaces/email-gateway.interface.ts` - Email gateway contract
- `interfaces/sms-gateway.interface.ts` - SMS gateway contract
- `providers/sendgrid/sendgrid.service.ts` - SendGrid implementation
- `providers/sendgrid/sendgrid-webhook.controller.ts` - SendGrid webhook handler
- `providers/twilio/twilio.service.ts` - Twilio implementation
- `providers/twilio/twilio-webhook.controller.ts` - Twilio webhook handler
- `providers/mock/` - Mock implementations for testing
- `errors/` - Custom exceptions

**Gateway Interface Pattern**:
```typescript
interface IEmailGateway {
  send(payload: EmailPayload): Promise<EmailGatewayResponse>;
  verifyWebhookSignature(body: any, signature: string): boolean;
}
```

**Webhook Flow**:
1. Gateway (SendGrid/Twilio) sends POST request to webhook endpoint
2. Signature verification ensures request authenticity
3. Event is mapped to internal status (`delivered` → `DELIVERED`)
4. `LogsService` updates corresponding log by `providerMessageId`
5. Status appended to `statusHistory` array

**API Endpoints** (Webhooks):
- `POST /webhooks/sendgrid` - SendGrid delivery events
- `POST /webhooks/twilio` - Twilio status callbacks

**Design Notes**:
- Factory pattern allows runtime provider selection via config
- Mock providers enable testing without real API calls
- Webhook signature verification prevents spoofed status updates
- Rate limit handling with exponential backoff
- Provider-specific error mapping to internal exceptions

---

### 5. **Compliance Module** (`src/compliance/`)
**Purpose**: Enforces FDCPA/TCPA regulations and debtor preferences.

**Responsibilities**:
- Evaluating compliance rules before dispatch
- Time-of-day restrictions (FDCPA: 8am-9pm in debtor's timezone)
- Frequency limits (daily contact caps)
- Opt-out enforcement (channel-specific and global)
- Providing compliance check results with `nextAllowedAt` timestamps

**Key Files**:
- `compliance.service.ts` - Orchestrates rule evaluation
- `rules/rule.interface.ts` - Rule contract
- `rules/time-of-day.rule.ts` - Time restriction enforcement
- `rules/frequency-limit.rule.ts` - Daily contact limit enforcement
- `rules/opt-out.rule.ts` - Opt-out preference enforcement
- `errors/` - Custom exceptions

**Rule Architecture**:
Each rule implements the `ComplianceRule` interface:
```typescript
interface ComplianceRule {
  name: string;
  check(context: ComplianceContext): Promise<ComplianceResult>;
}

interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
}
```

**Rule Evaluation Order** (fail-fast):
1. **OptOutRule** - Hard stop for opted-out channels or Do Not Contact flag
2. **TimeOfDayRule** - Check current time against allowed hours
3. **FrequencyLimitRule** - Check recent communication count against daily limit

**Compliance Context**:
```typescript
{
  debtorId: string
  organizationId: string
  communicationType: 'EMAIL' | 'SMS'
  scheduledAt?: Date
  debtorPreferences?: DebtorPreference
  recentCommunications?: CommunicationLog[]
}
```

**Design Notes**:
- Rules run in sequence with fail-fast semantics
- `ComplianceService` fetches preferences and recent logs once, passes to all rules
- Returns detailed reason and next allowed time for better UX
- Extensible - new rules can be added by implementing interface

---

### 6. **Preferences Module** (`src/preferences/`)
**Purpose**: Manages debtor-specific communication preferences.

**Responsibilities**:
- CRUD operations for debtor preferences
- Storing opt-out status per channel
- Managing allowed contact hours and frequency limits
- Tenant-scoped preference management

**Key Files**:
- `preferences.service.ts` - Business logic
- `preferences.controller.ts` - REST endpoints
- `entities/debtor-preference.entity.ts` - PostgreSQL entity
- `dto/` - Request/response DTOs
- `errors/` - Custom exceptions

**DebtorPreference Entity** (PostgreSQL):
```typescript
{
  id: UUID
  debtorId: UUID
  organizationId: UUID
  doNotContact: boolean
  optedOutChannels: string[]  // ['EMAIL', 'SMS']
  allowedStartHour: number    // Default: 8
  allowedEndHour: number      // Default: 21
  dailyContactLimit: number   // Default: 3
  timezone?: string           // Debtor's timezone
  preferredLanguage: string   // Default: 'en'
  createdAt: Date
  updatedAt: Date
}
```

**API Endpoints**:
- `GET /preferences/debtor/:debtorId` - Get preferences for a debtor
- `PUT /preferences/debtor/:debtorId` - Update preferences
- `POST /preferences/debtor/:debtorId/opt-out` - Mark channel as opted out
- `POST /preferences/debtor/:debtorId/opt-in` - Remove opt-out for channel

**Design Notes**:
- Preferences are tenant-scoped (organization-specific)
- Defaults are applied if no custom preferences exist
- Opt-out is channel-specific for granular control
- Global `doNotContact` flag overrides all channels

---

## Data Model

### PostgreSQL Entities

**Template**:
- Structured, versioned content
- Organization-scoped
- Immutable versions for audit trail

**DebtorPreference**:
- Communication preferences per debtor
- Opt-out status and contact restrictions
- Timezone and language preferences

### MongoDB Documents

**CommunicationLog**:
- High-volume, append-only logs
- Embedded `statusHistory` array
- Flexible schema for provider-specific metadata
- Indexed for performance on common queries

### Dual Database Rationale

- **PostgreSQL**: Structured data with relationships, ACID transactions, complex queries
- **MongoDB**: Write-heavy logs, time-series data, horizontal scaling, flexible schema
