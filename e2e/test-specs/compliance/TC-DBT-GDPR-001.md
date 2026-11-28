TC-DBT-GDPR-001: Debtor Can Export All Data Across Organizations (GDPR Article 15)

Tags: api-debtors, debtor, P0, compliance, GDPR

Preconditions:

    Debtor user authenticated with organizationIds: ["org-a", "org-b"]
    Debtor has data in multiple services (debts, payments, communications)

Test Steps:

    Debtor requests: POST /debtors/export-my-data
    Verify service aggregates data from:
        api-debts: All debts across Org A and Org B
        api-transactions: All payment history across both orgs
        api-communications: All communications across both orgs
        api-debtors: Debtor profile information
    Verify response includes complete data export (JSON or PDF)
    Verify export includes organizationName for each record
    Verify export covers ALL organizations in organizationIds
    Verify no data from non-member organizations included
    Verify DataExported event published for audit trail

Expected Results:

    Complete data export across all member organizations
    GDPR Article 15 "Right of Access" satisfied
    No manual org-by-org requests required
    Audit trail for compliance reporting
    Export scoped to debtor's organizationIds

Cleanup: None