### TC-ORG-ANALYTICS-001: Dashboard Aggregates Data from Multiple Services
**Tags**: `api-organizations`, `analytics`, `P1`, `integration`, `async`

**Preconditions**:
- Org admin authenticated
- api-debts, api-transactions, api-communications services running
- Organization has existing data across services

**Test Steps**:
1. GET `/organizations/{orgId}/dashboard-summary` with `x-org-id: org-123`
2. Verify response 200 OK (within 5 second timeout)
3. Verify response structure:
   ```json
   {
     "totalPortfolios": 5,
     "totalDebts": 1500,
     "totalDebtors": 1200,
     "totalInvested": [
       { "period": "2024-01", "value": 1000000 },
       { "period": "2024-02", "value": 1100000 }
     ],
     "totalCollected": [
       { "period": "2024-01", "value": 50000 },
       { "period": "2024-02", "value": 75000 }
     ],
     "totalOutstanding": 975000,
     "overallRecoveryRate": 45.5,
     "statusCounts": {
       "active": 850,
       "paid": 200,
       "settled": 150,
       "defaulted": 100,
       "paymentPlan": 200
     },
     "todayCollections": 12500,
     "todayPaymentPlans": 12,
     "todayContacts": 85,
     "yesterdayCollections": 11000,
     "yesterdayPaymentPlans": 10,
     "yesterdayContacts": 78,
     "topPortfolios": [
       { "id": "port-1", "name": "Medical A", "value": 500000 },
       { "id": "port-2", "name": "Retail B", "value": 300000 }
     ],
     "generatedAt": "2024-03-20T10:30:00Z"
   }
   ```
4. Verify metrics aggregated from multiple services:
   - `totalDebts`, `totalDebtors`, `statusCounts` from api-debts
   - `totalCollected`, `todayCollections`, `todayPaymentPlans` from api-transactions
   - `todayContacts` from api-communications
5. Monitor event flow:
   - Request events published with correlationId
   - Response events received from each service
   - Temporary reply topics created and cleaned up
6. Verify timeout handling (if service doesn't respond)

**Expected Results**:
- Dashboard loads within 5 seconds
- Data aggregated from all responding services
- Missing service data handled gracefully (partial results)
- EventOrchestratorClient manages request-response flow
- Temporary topics cleaned up after response

**Cleanup**: None