### TC-ORG-SETTINGS-001: Organization Admin Updates Settings
**Tags**: `api-organizations`, `settings`, `P1`, `happy-path`

**Preconditions**:
- Org admin authenticated
- Org admin has `orgs:settings:write` permission
- Organization has default settings

**Test Steps**:
1. GET `/organizations/{orgId}/settings` to retrieve current settings
2. PATCH `/organizations/{orgId}/settings` with `x-org-id: org-123` and:
   ```json
   {
     "settings": {
       "branding": {
         "logo_url": "https://cdn.acme.com/new-logo.png",
         "primary_color_hex": "#FF5733"
       },
       "compliance": {
         "fdcpa_strict_mode": true
       }
     }
   }
   ```
3. Verify response 200 OK
4. Verify settings deep-merged (existing fields preserved)
5. Verify `OrganizationSettingsUpdated` event published with:
   - `updatedSettingKeys`: ["branding.logo_url", "branding.primary_color_hex", "compliance.fdcpa_strict_mode"]
6. GET `/organizations/{orgId}/settings` to verify persistence

**Expected Results**:
- Settings updated successfully
- Deep merge preserves unchanged settings
- Event published with specific changed keys
- Updated settings persisted in database
- Other services can react to setting changes

**Cleanup**:
- Restore original settings