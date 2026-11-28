# Event System Mappings

This document provides a source-of-truth mapping for the event-driven architecture. It details which microservice publishes an event and which microservices subscribe to it. This was generated automatically and should be reviewed for accuracy.

---

## Analytics Events

### `analytics.dashboard_summary.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.dashboard_summary.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.recovery_trends.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.recovery_trends.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.portfolio_performance.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.portfolio_performance.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.flow.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.flow.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.debtor_focus.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.debtor_focus.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.collector_stats.requested`
- **Published By:** `api-collectors`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.collector_stats.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-collectors`
- **Corrective Naming:** `No update required`

### `analytics.collector_leaderboard.requested`
- **Published By:** `api-collectors`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.collector_leaderboard.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-collectors`
- **Corrective Naming:** `No update required`

### `analytics.geographic_debtors.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_debtors.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_creditors.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_creditors.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_combined.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_combined.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_payment_plans.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_payment_plans.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_responsiveness.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_responsiveness.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_likelihood_to_pay.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_likelihood_to_pay.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_default_risk.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_default_risk.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `analytics.geographic_debt_age.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `analytics.geographic_debt_age.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

---

## Collectors Events (`api-collectors`)

### `collectors.work_queue_item.created`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.updated`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.status_changed`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.assigned`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.completed`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.deferred`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.priority_changed`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.work_queue_item.removed`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.note_added`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.contact_attempted`
- **Published By:** `api-collectors`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `collectors.debtor.follow_up_scheduled`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.action_logged`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.tag_added`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.tag_removed`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `collectors.debtor.assigned`
- **Published By:** `api-collectors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

---

## Communications Events (`api-communications`)

### `communications.communication.dispatched`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.delivered`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.failed`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.opened`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.clicked`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.blocked`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `communications.communication.spam_reported`
- **Published By:** `api-communications`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

---

## Debtors Events (`api-debtors`)

### `debtors.identity.created`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.identity.user_linked`
- **Published By:** `api-debtors`
- **Subscribed By:** `api-debts`
- **Corrective Naming:** `No update required`

### `debtors.profile.created`
- **Published By:** `api-debtors`
- **Subscribed By:** `api-analytics`
- **Corrective Naming:** `No update required`

### `debtors.profile.updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.profile.invited`
- **Published By:** `api-debtors`
- **Subscribed By:** `api-communications`, `api-debtors`
- **Corrective Naming:** `debtors.invitation.requested`

### `debtors.profile.information_received`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.profile.verification_status_changed`
- **Published By:** `api-debtors`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `debtors.profile.address_updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.profile.email_updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.profile.phone_updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.invitation.sent`
- **Published By:** `api-communications`
- **Subscribed By:** `api-users`, `api-debtors`
- **Corrective Naming:** `communications.debtor_invitation.dispatched`

### `debtors.invitation_batch.sent`
- **Published By:** `api-debtors`
- **Subscribed By:** `api-communications`, `api-users`
- **Corrective Naming:** `debtors.invitation_batch.requested`

### `debtors.demographics.created`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.demographics.updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.demographics.deleted`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.verifications.verification_requested`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.verifications.verification_completed`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.verifications.verification_failed`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.documents.document_uploaded`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.documents.document_updated`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.documents.document_deleted`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.documents.document_archived`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debtors.import_batch.completed`
- **Published By:** `api-debtors`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

---

## Debts Events (`api-debts`)

### `debts.debt.created`
- **Published By:** `api-debts`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `debts.debt.updated`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.debt.status_changed`
- **Published By:** `api-debts`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `debts.portfolio.created`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.updated`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.status_changed`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.sold`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.user_access_granted`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.user_access_revoked`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.import_started`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.import_completed`
- **Published By:** `api-debts`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `debts.portfolio.debtor_batch_ready`
- **Published By:** `api-debts`
- **Subscribed By:** `api-debtors`
- **Corrective Naming:** `No update required`

---

## Organizations Events (`api-organizations`)

### `organizations.organization.created`
- **Published By:** `api-organizations`
- **Subscribed By:** `api-users`
- **Corrective Naming:** `No update required`

### `organizations.organization.updated`
- **Published By:** `api-organizations`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `organizations.organization.name_changed`
- **Published By:** `api-organizations`
- **Subscribed By:** `api-users`
- **Corrective Naming:** `No update required`

### `organizations.organization.status_changed`
- **Published By:** `api-organizations`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `organizations.organization.suspended`
- **Published By:** `api-organizations`
- **Subscribed By:** `api-users`
- **Corrective Naming:** `No update required`

### `organizations.organization.reactivated`
- **Published By:** `api-organizations`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `organizations.organization.settings.updated`
- **Published By:** `api-organizations`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `organizations.onboarding.requested`
- **Published By:** `api-organizations`
- **Subscribed By:** `event-orchestrator`
- **Corrective Naming:** `No update required`

### `organizations.onboarding.completed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

### `organizations.onboarding.failed`
- **Published By:** `event-orchestrator`
- **Subscribed By:** `api-organizations`
- **Corrective Naming:** `No update required`

---

## Transactions Events (`api-transactions`)

### `transactions.transaction.succeeded`
- **Published By:** `api-transactions`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `transactions.transaction.failed`
- **Published By:** `api-transactions`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `transactions.refund.issued`
- **Published By:** `api-transactions`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `transactions.payment_plan.status_changed`
- **Published By:** `api-transactions`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `transactions.payment_plan.created`
- **Published By:** `api-transactions`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `transactions.payment_plan.completed`
- **Published By:** `api-transactions`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `transactions.payment.received`
- **Published By:** `api-transactions`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

---

## User Events (`api-users`)

### `users.user.created`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.user.activated`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.user.profile_updated`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.user.status_changed`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.user.deleted`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.debtor_user.created`
- **Published By:** `api-users`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `users.debtor_user.created_batch`
- **Published By:** `api-users`
- **Subscribed By:** `api-debtors`
- **Corrective Naming:** `No update required`

### `users.debtor_user.activated`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.auth.login_success`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.auth.login_failed`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.auth.token_issued`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.auth.context_switched`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.auth.password_reset_requested`
- **Published By:** `api-users`
- **Subscribed By:** `api-communications`
- **Corrective Naming:** `No update required`

### `users.role.created`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.role.updated`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.role.deleted`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.role.assigned`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.role.unassigned`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `users.permissions.changed`
- **Published By:** `api-users`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

---

## Voice Events (`api-voice`)

### `voice.voice_call.started`
- **Published By:** `api-voice`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `voice.voice_call.completed`
- **Published By:** `api-voice`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`

### `voice.voice_call.recording_ready`
- **Published By:** `api-voice`
- **Subscribed By:** `None identified`
- **Corrective Naming:** `No update required`
