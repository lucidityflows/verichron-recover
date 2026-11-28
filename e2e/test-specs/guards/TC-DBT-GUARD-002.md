TC-DBT-GUARD-002: DebtorOwnershipGuard Validates Resource Ownership

Tags: api-debts, debtor, guards, P1, future

Preconditions:

    Debtor user authenticated
    DebtorOwnershipGuard implemented
    Endpoint decorated with @DebtorOwnership() decorator

Test Steps:

    Debtor requests: GET /debts/{debtId}
    Verify DebtorOwnershipGuard executes
    Guard validates: debt.debtorUserId === activeContext.userId
    Guard validates: debt.organizationId IN activeContext.organizationIds
    If both pass, verify 200 OK
    If ownership check fails, verify 403 Forbidden
    Verify guard runs BEFORE controller method

Expected Results:

    Ownership validation happens at guard layer
    Controller receives pre-validated requests
    Clear separation of concerns
    Reusable guard across multiple endpoints

Cleanup: None