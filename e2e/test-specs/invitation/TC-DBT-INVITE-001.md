TC-DBT-INVITE-001: Organization Admin Invites Debtor by debtorId

Tags: api-debtors, api-users, debtor, P0, happy-path, integration

Preconditions:

    Org admin authenticated
    Debtor profile exists in api-debtors with debtorId: debtor-123, userId: null
    Org admin has debtor:invite permission

Test Steps:

    POST /debtors/debtor-123/invite with:

    {
      "email": "john.doe@email.com",
      "firstName": "John",
      "lastName": "Doe"
    }

    Verify response 201 Created
    Verify DebtorInvited event published with debtorId, organizationId, email
    Wait for event processing (api-users creates user)
    Query api-users: GET /users?email=john.doe@email.com
    Verify user created with:
        Status: PENDING
        UserMembershipEntity with roleId = DEBTOR role
        invitationToken generated
    Verify UserCreated event published by api-users
    Verify invitation email sent (mock/logs)

Expected Results:

    First-time debtor invitation creates user account
    User linked to debtor profile via events
    User membership created with DEBTOR role
    Invitation email sent
    User status PENDING until activation

Cleanup:

    Delete test user
    Unlink debtor from user