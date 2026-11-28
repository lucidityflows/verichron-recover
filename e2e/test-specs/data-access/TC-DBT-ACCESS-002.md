TC-DBT-ACCESS-002: Debtor Cannot Access Other Debtors' Debts

Tags: api-debts, debtor, P0, security, negative

Preconditions:

    Debtor A authenticated (userId: user-a, member of Org 1)
    Debtor B exists (userId: user-b, also member of Org 1)
    Debt X owned by Debtor B in Org 1

Test Steps:

    Debtor A attempts: GET /debts/{debtXId}
    Verify response 404 Not Found OR 403 Forbidden
    Verify error indicates debt not found or access denied
    Verify service layer query includes ownership check:

    WHERE id = :debtId 
    AND debtor_user_id = :currentUserId
    AND organization_id IN (:organizationIds)

    Verify query returns no results (ownership fails)

Expected Results:

    Ownership-based access control prevents cross-debtor access
    Debtors in same org cannot see each other's debts
    404 prevents information disclosure (debt exists vs doesn't exist)
    Database-level filtering enforced

Cleanup: None