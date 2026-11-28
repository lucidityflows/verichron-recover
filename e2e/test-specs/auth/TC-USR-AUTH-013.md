TC-USR-AUTH-013: Debtor Token Rejected If Missing Required Fields

Tags: api-users, auth, debtor, P1, security, negative

Preconditions:

    Manually crafted JWT for testing

Test Steps:

    Create JWT with userType: "DEBTOR" but missing organizationIds

    Make authenticated request

    Verify 401 Unauthorized with error: "debtor must have organizationIds array"

    Create JWT with organizationIds: [] (empty array)

    Make authenticated request

    Verify 401 Unauthorized with error: "debtor must have at least one organization"

    Create JWT with organizationIds present but missing debtorPermissions

    Make authenticated request

    Verify 401 Unauthorized with error: "debtor must have debtorPermissions"

    Create JWT with all fields but isDebtor: false

    Make authenticated request

    Verify 401 Unauthorized with error: "debtor token must have isDebtor=true"

Expected Results:

    JwtStrategy validates ALL required debtor token fields
    Missing or invalid fields result in 401
    Clear error messages for each validation failure
    Security boundary enforced

Cleanup: None