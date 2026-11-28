TC-DBT-SOC2-001: Organizations Cannot See Debtor's Other Org Relationships

Tags: api-debtors, api-organizations, debtor, P0, compliance, SOC2

Preconditions:

    Debtor is member of Org A, Org B, and Org C
    Org A admin authenticated

Test Steps:

    Org A admin queries: GET /debtors?organizationId=org-a
    Verify response includes debtor
    Verify debtor record shows ONLY Org A relationship
    Verify NO indication debtor is also member of Org B or C
    Verify organizationIds array NOT exposed to org admins
    Org A admin attempts: GET /debtors/debtor-123/organizations
    Verify 403 Forbidden or endpoint doesn't exist
    Verify organization-to-organization isolation maintained

Expected Results:

    Org A cannot discover debtor's Org B/C memberships
    Complete organization-to-organization isolation
    SOC2 compliance for multi-tenancy
    Debtor privacy protected
    Only debtor user sees their full org list

Cleanup: None