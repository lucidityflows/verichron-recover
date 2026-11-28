TC-DBT-ACCESS-001: Debtor Can Access Own Debts Across All Organizations

Tags: api-debts, debtor, P0, happy-path, multi-org

Preconditions:

    Debtor user authenticated with organizationIds: ["org-a", "org-b", "org-c"]
    Debts exist:
        5 debts owned by debtor in Org A
        3 debts owned by debtor in Org B
        2 debts owned by debtor in Org C
        10 debts owned by OTHER debtors in Org A

Test Steps:

    GET /debts/my-debts (debtor-specific endpoint)
    Verify response 200 OK
    Verify response contains 10 debts total (5+3+2)
    Verify ALL returned debts have debtorUserId === authenticated user ID
    Verify debts from all three organizations present
    Verify NO debts from other debtors included
    Verify query executed:

    WHERE debtor_user_id = :userId 
    AND organization_id IN (:organizationIds)

Expected Results:

    Debtor sees ALL their debts across organizations
    Seamless multi-org data aggregation
    Ownership-based filtering enforced
    Other debtors' data completely isolated
    UI can display unified debt view

Cleanup: None