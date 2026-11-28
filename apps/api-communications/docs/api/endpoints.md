# API-Communications Microservice: High-Level API Endpoints

This document outlines the high-level API endpoints exposed by the `api-communications` microservice, categorized by their respective feature modules.

---

## Templates Module

Endpoints for managing communication templates (Email, SMS, Letter).

*   `GET /templates` - List templates (organization-scoped, paginated)
*   `GET /templates/:id` - Get template details
*   `POST /templates` - Create new template
*   `PUT /templates/:id` - Update template (creates new version)
*   `DELETE /templates/:id` - Soft delete template
*   `POST /templates/:id/preview` - Preview rendered template

---

## Logs Module

Endpoints for querying the immutable communication logs.

*   `GET /logs` - Query communication logs (filterable by debtor, debt, status, type, date range)
*   `GET /logs/:id` - Get specific log entry with status history

---

## Dispatch Module

Endpoints for manual dispatch of communications.

*   `POST /dispatch` - Manually dispatch a communication (admin use)

---

## Preferences Module

Endpoints for managing debtor-specific communication preferences.

*   `GET /preferences/debtor/:debtorId` - Get preferences for a debtor
*   `PUT /preferences/debtor/:debtorId` - Update preferences
*   `POST /preferences/debtor/:debtorId/opt-out` - Opt out of channel
*   `POST /preferences/debtor/:debtorId/opt-in` - Opt in to channel

---

## Webhooks (External)

External endpoints for receiving status updates from communication gateways.

*   `POST /webhooks/sendgrid` - SendGrid delivery events
*   `POST /webhooks/twilio` - Twilio status callbacks
