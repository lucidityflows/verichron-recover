TC-DBT-INVITE-003: Cannot Invite Debtor with Mismatched debtorId

Tags: api-debtors, api-users, debtor, P1, security, negative

Preconditions:

    Org A admin authenticated
    Debtor profile debtor-123 exists
    Different debtor profile debtor-456 exists with email jane@email.com

Test Steps:

    Org A admin attempts: POST /debtors/debtor-123/invite with email: "jane@email.com"
    api-users checks: User exists with this email? YES
    api-users checks: User linked to debtorId 123? NO (linked to 456)
    Verify response 409 Conflict or 400 Bad Request
    Verify error message: "Email already associated with different debtor profile"
    Verify no membership created
    Verify no event published

Expected Results:

    Email uniqueness enforced globally
    Cannot link same email to multiple debtor profiles
    Clear error message
    Security boundary prevents profile hijacking

Cleanup: None