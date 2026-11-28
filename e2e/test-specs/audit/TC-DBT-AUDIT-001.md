TC-DBT-AUDIT-001: Debtor Access Events Logged for Compliance

Tags: api-debts, api-debtors, debtor, P1, audit

Preconditions:

    Debtor user authenticated
    Event audit logging enabled

Test Steps:

    Debtor performs actions:
        GET /debts/my-debts (views debts)
        POST /payments (makes payment)
        GET /debtors/my-profile (views profile)
    Verify events published for each action:
        DebtorDebtAccessed with userId, debtIds, organizationIds
        DebtorPaymentCreated with userId, amount, debtId
        DebtorProfileAccessed with userId, timestamp
    Verify events include:
        userId (debtor user ID)
        debtorId (debtor profile ID)
        organizationIds (orgs involved)
        ipAddress (from request metadata)
        timestamp (ISO 8601)
        action (read/write)
    Verify events suitable for compliance reporting

Expected Results:

    Complete audit trail of debtor actions
    Events contain compliance-required fields
    Suitable for SOC2 audit logs
    Tracks multi-org access patterns
    Supports FDCPA/FCRA compliance requirements

Cleanup: None