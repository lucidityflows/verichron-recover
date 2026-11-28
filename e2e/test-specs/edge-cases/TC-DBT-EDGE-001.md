TC-DBT-EDGE-001: Debtor with No Organization Memberships Cannot Login

Tags: api-users, debtor, P2, edge-case

Preconditions:

    Debtor user exists but has ZERO active memberships
    All memberships removed/revoked

Test Steps:

    POST /auth/login with debtor credentials
    Verify response includes empty organizations array:

    { "availableOrganizations": [] }

    Attempt POST /auth/token with any organizationId
    Verify 400 Bad Request or 401 Unauthorized
    Verify error: "User has no active organization memberships"

Expected Results:

    Login succeeds (credentials valid)
    Token generation fails (no valid orgs)
    Clear error message
    Debtor cannot access system without org membership

Cleanup: None