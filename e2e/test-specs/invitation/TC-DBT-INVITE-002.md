TC-DBT-INVITE-002: Second Organization Invites Existing Debtor User

Tags: api-debtors, api-users, debtor, P0, multi-org, integration

Preconditions:

    Debtor user already exists (email: john.doe@email.com)
    User has userId: user-123, linked to debtorId: debtor-123
    User is active member of Org A with DEBTOR role
    Org B admin authenticated

Test Steps:

    Org B admin POST /debtors/debtor-123/invite with same email
    api-users checks: User with email exists? YES
    api-users checks: User linked to this debtorId? YES
    api-users creates ADDITIONAL UserMembershipEntity:
        userId: user-123
        organizationId: org-b
        roleId: DEBTOR role
    Verify response 201 Created
    Verify DebtorInvitationAccepted event published
    Verify NO new user created (existing user reused)
    Verify user now has 2 membership records
    User logs out and logs back in
    Decode new JWT: verify organizationIds: ["org-a", "org-b"]

Expected Results:

    Existing debtor user NOT duplicated
    Additional membership created for new org
    Email lookup prevents duplicate users
    Debtor token automatically includes new org
    No re-activation required (user already active)

Cleanup:

    Remove Org B membership