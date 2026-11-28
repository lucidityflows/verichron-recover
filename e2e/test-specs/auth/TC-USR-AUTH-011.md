TC-USR-AUTH-011: Debtor User Completes Two-Step Login with Multi-Org Token

Tags: api-users, auth, debtor, P0, happy-path

Preconditions:

    Debtor user exists with DEBTOR role
    Debtor has accepted invitations from Org A, Org B, Org C
    Debtor has 3 UserMembershipEntity records (one per org)
    User status is ACTIVE

Test Steps:

    Step 1 - Credentials Authentication:
        POST /auth/login with debtor credentials
        Verify response 200 OK
        Verify ACT cookie set
        Verify response contains all organizations:

        {
          "availableOrganizations": [
            { "organizationId": "org-a", "organizationName": "Acme Collections" },
            { "organizationId": "org-b", "organizationName": "Beta Recovery" },
            { "organizationId": "org-c", "organizationName": "Collect Co" }
          ]
        }

    Step 2 - Debtor Token Issuance:
        POST /auth/token with { "organizationId": "org-a" } (any org from list)
        Verify response 200 OK with JWT
        Decode JWT and verify:

        {
          "sub": "debtor-user-uuid",
          "userType": "DEBTOR",
          "https://verichroninc.com/claims": {
            "organizationIds": ["org-a", "org-b", "org-c"],
            "debtorPermissions": ["debtor:self:read", "debtor:self:pay", ...],
            "isDebtor": true
          }
        }

    Verify Multi-Org Access:
        Verify JWT contains ALL organizationIds (not just selected one)
        Verify userType is DEBTOR (not ORGANIZATION_USER)
        Verify debtorPermissions present (not permissions)
        Verify isDebtor: true flag set

Expected Results:

    Debtor login flow completes successfully
    JWT contains ALL organizations debtor has accepted invitations from
    Token enables cross-org access for debtor's own data
    No organization context switching required

Cleanup: None