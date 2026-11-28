TC-DBT-EDGE-002: Debtor Membership Removed Mid-Session

Tags: api-users, api-debts, debtor, P2, edge-case

Preconditions:

    Debtor authenticated with organizationIds: ["org-a", "org-b"]
    Access token valid for 15 minutes

Test Steps:

    Org A admin removes debtor's membership (deletes UserMembershipEntity)
    Debtor attempts: GET /debts/my-debts (using existing token)
    Verify request succeeds (token still valid)
    Verify debts from Org A still returned (token not re-validated mid-session)
    After access token expires, debtor refreshes token
    Verify new token contains organizationIds: ["org-b"] only
    Verify subsequent requests exclude Org A debts

Expected Results:

    Token validity period honored (no mid-session revocation)
    Refresh token picks up membership changes
    Eventual consistency model
    Clear security vs usability trade-off

Cleanup:

    Restore debtor membership in Org A