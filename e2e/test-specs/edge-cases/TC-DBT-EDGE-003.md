TC-DBT-EDGE-003: Debtor and Organization User with Same Email

Tags: api-users, debtor, P2, edge-case, security

Preconditions:

    User john@email.com exists as Organization User in Org X
    Debtor profile attempts invitation with same email

Test Steps:

    Org Y admin attempts: POST /debtors/debtor-123/invite with email: "john@email.com"

    System checks: Email exists as org user? YES

    System checks: Can user have dual roles (org user + debtor)?

    Verify behavior based on design decision:

    Option A (dual-role supported):
        User gains additional DEBTOR membership
        User memberships include both org user and debtor roles
        Login shows both role types

    Option B (dual-role prevented):
        Invitation rejected with 409 Conflict
        Error: "Email already in use for organization user"

Expected Results:

    Clear policy on dual-role scenarios
    No silent failures
    Security boundary enforced
    Documented behavior in response

Cleanup:

    Remove test membership if created