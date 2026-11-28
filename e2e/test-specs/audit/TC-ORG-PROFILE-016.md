### TC-ORG-PROFILE-016: Organization Changes Include Audit Trail
**Tags**: `api-organizations`, `profiles`, `P2`, `audit`

**Preconditions**:
- Org admin authenticated

**Test Steps**:
1. PATCH `/orgs/{orgId}` to update organization
2. Verify `OrganizationUpdated` event includes `updatedBy`
3. Verify `updatedAt` timestamp updated
4. PATCH `/orgs/{orgId}` with `status: SUSPENDED`
5. Verify `OrganizationStatusChanged` event includes:
   - `updatedBy`
   - `previousStatus`
   - `newStatus`
   - `reason` (if provided)

**Expected Results**:
- Complete audit trail of who changed what
- Status transitions tracked
- Timestamps accurate
- Events suitable for compliance reporting

**Cleanup**:
- Restore organization state