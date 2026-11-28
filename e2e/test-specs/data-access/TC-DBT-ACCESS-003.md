TC-DBT-ACCESS-003: Debtor Cannot Access Debts from Non-Member Organization

Tags: api-debts, debtor, P1, security, multi-org

Preconditions:

    Debtor user authenticated with organizationIds: ["org-a", "org-b"]
    Debtor has debt in Org C (not in organizationIds array)
    Note: This can happen if org removed debtor access

Test Steps:

    Debtor attempts: GET /debts/my-debts
    Verify debts from Org C NOT included in response
    Verify only debts from Org A and Org B returned
    Verify query filters by organization_id IN (organizationIds)
    Attempt direct access: GET /debts/{orgCDebtId}
    Verify 404 Not Found (debt filtered out)

Expected Results:

    OrganizationIds array in JWT controls access scope
    Removed org memberships immediately block access
    Token refresh required to regain access if re-invited
    No data leakage from non-member organizations

Cleanup: None