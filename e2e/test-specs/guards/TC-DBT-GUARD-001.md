TC-DBT-GUARD-001: OrgContextGuard Creates DebtorContext for DEBTOR userType

Tags: api-users, api-organizations, api-debtors, guards, debtor, P1

Preconditions:

    Debtor user authenticated
    JWT contains userType: "DEBTOR", organizationIds: ["org-a", "org-b"]

Test Steps:

    Make authenticated request to ANY protected endpoint
    Verify OrgContextGuard executes
    Verify request.activeContext populated with:

    {
      type: 'DEBTOR',
      userId: 'debtor-user-id',
      organizationIds: ['org-a', 'org-b'],
      permissions: ['debtor:self:read', 'debtor:self:pay', ...]
    }

    Verify type discriminator enables TypeScript type narrowing
    Verify downstream services can access activeContext.organizationIds
    Verify guard logs: "Debtor access granted for user: {userId}"

Expected Results:

    Guard creates proper DebtorContext structure
    Type discriminator enables type-safe code
    organizationIds available to all downstream logic
    Consistent context structure across all services

Cleanup: None