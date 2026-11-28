TC-USR-AUTH-012: Debtor Refresh Token Dynamically Updates organizationIds

Tags: api-users, auth, debtor, P1, multi-org

Preconditions:

    Debtor authenticated with refresh token
    Debtor currently member of Org A and Org B
    Org C subsequently invites debtor and debtor accepts

Test Steps:

    Verify current JWT contains organizationIds: ["org-a", "org-b"]
    Org C admin invites debtor (creates 3rd UserMembershipEntity)
    Debtor accepts invitation (user membership activated)
    POST /auth/refresh with debtor's refresh token
    Decode new access token
    Verify organizationIds now includes all three: ["org-a", "org-b", "org-c"]
    Verify debtor can now access debts from Org C

Expected Results:

    Refresh token dynamically updates organizationIds array
    New org memberships reflected without re-login
    Token refresh queries current memberships (not cached)
    Debtor gains immediate access to new org's debts

Cleanup:

    Remove test membership from Org C