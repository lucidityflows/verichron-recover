TC-DBT-PERM-001: Debtor Permissions Are Self-Scoped Only

Tags: api-users, debtor, rbac, P1

Preconditions:

    Debtor user authenticated
    JWT contains debtorPermissions array

Test Steps:

    Decode JWT and verify permissions include ONLY self-scoped:
        debtor:self:read
        debtor:self:pay
        debtor:self:update
        debtor:self:export
        debtor:self:payment_history
        debtor:self:documents
        debtor:self:preferences

    Verify NO organization-scoped permissions present:
        ❌ debt:read (org permission)
        ❌ user:read (org permission)
        ❌ payment:create (org permission)

    Attempt to access org admin endpoint: GET /users

    Verify 403 Forbidden (lacks user:read permission)

Expected Results:

    Debtor permissions completely isolated from org permissions
    :self: convention enforces ownership scope
    Debtors cannot access org management features
    Permission model matches architectural design

Cleanup: None