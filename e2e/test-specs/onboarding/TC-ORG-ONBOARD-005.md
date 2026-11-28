### TC-ORG-ONBOARD-005: Failed User Provisioning Doesn't Block Organization Creation
**Tags**: `api-organizations`, `onboarding`, `api-users`, `P1`, `resilience`, `async`

**Preconditions**:
- Platform admin authenticated
- api-users service temporarily unavailable or not listening to events

**Test Steps**:
1. POST `/onboarding` with valid payload
2. Verify organization created successfully (201 Created)
3. Verify organization status is `ACTIVE`
4. Verify `OrganizationCreated` event published
5. Check that api-users didn't process event (service down)
6. Bring api-users service back online
7. Event redelivered via Pub/Sub retry
8. Verify admin user eventually created
9. GET `/onboarding/{orgId}/status`
10. Verify status shows provisioning completed

**Expected Results**:
- Organization creation succeeds regardless of downstream failures
- Event-driven architecture provides resilience
- Pub/Sub retries ensure eventual consistency
- Services remain decoupled
- No cascading failures

**Cleanup**:
- Delete test organization and user