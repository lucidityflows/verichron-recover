# API Organizations Error Code Registry

This document provides a comprehensive registry of all error codes used in the api-organizations microservice. Error codes follow the pattern `ORGS_<DOMAIN>_XXX` for structured categorization and easier debugging.

## Error Code Structure

- **Prefix**: `ORGS_` (Organizations service identifier)
- **Domain**: `PROFILE`, `ONBOARDING`, `SETTINGS`, etc. (feature/context)
- **Number**: Sequential identifier within the domain

## Error Code Registry

### ORGS_PROFILE_XXX - Profile & CRUD Operations

Error codes for organization profile management and contact information CRUD operations.

| Code | Exception | HTTP Status | Description |
|------|-----------|-------------|-------------|
| `ORGS_PROFILE_001` | OrganizationNotFoundException | 404 | Organization with specified ID not found |
| `ORGS_PROFILE_002` | OrganizationAlreadyExistsException | 409 | Organization with specified name already exists (CRUD context) |
| `ORGS_PROFILE_003` | AddressNotFoundException | 404 | Organization address with specified ID not found |
| `ORGS_PROFILE_004` | EmailNotFoundException | 404 | Organization email with specified ID not found |
| `ORGS_PROFILE_005` | PhoneNumberNotFoundException | 404 | Organization phone number with specified ID not found |

**Location**: `src/common/exceptions/`

### ORGS_ONBOARDING_XXX - Onboarding Workflow

Error codes for the organization provisioning and onboarding workflow.

| Code | Exception | HTTP Status | Description |
|------|-----------|-------------|-------------|
| `ORGS_ONBOARDING_001` | OrganizationAlreadyExistsException | 409 | Organization with specified name already exists (onboarding context) |
| `ORGS_ONBOARDING_002` | ParentOrganizationNotFoundException | 404 | Parent organization not found when creating child organization |
| `ORGS_ONBOARDING_003` | OnboardingFailedException | 500 | Onboarding workflow failed (event publishing, database errors) |
| `ORGS_ONBOARDING_004` | InvalidOrganizationTypeException | 400 | Invalid organization type provided |

**Location**: `src/onboarding/errors/`

### ORGS_SETTINGS_XXX - Settings Management

Error codes for organization settings configuration.

| Code | Exception | HTTP Status | Description |
|------|-----------|-------------|-------------|
| `ORGS_SETTINGS_001` | InvalidSettingsException | 400 | Invalid settings data provided |

**Location**: `src/settings/errors/`

## Reserved Code Ranges

To maintain consistency as the service grows:

- `ORGS_PROFILE_001-099` - Profile & CRUD operations
- `ORGS_ONBOARDING_001-099` - Onboarding workflow
- `ORGS_SETTINGS_001-099` - Settings management
- `ORGS_ANALYTICS_001-099` - Analytics operations (future)
- `ORGS_HIERARCHY_001-099` - Organization hierarchy (future)

## Client-Side Error Handling

Clients can handle errors programmatically using error codes:

```typescript
try {
  await api.createOrganization(data);
} catch (error) {
  switch (error.errorCode) {
    case 'ORGS_PROFILE_002':
    case 'ORGS_ONBOARDING_001':
      // Handle duplicate organization name
      showError('An organization with this name already exists');
      break;
    case 'ORGS_PROFILE_001':
      // Handle organization not found
      showError('Organization not found');
      break;
    default:
      showError('An unexpected error occurred');
  }
}
```

## Error Response Format

All exceptions using `BaseException` from `@verichron/error-handling` return this standard format:

```json
{
  "statusCode": 404,
  "message": "Organization with ID '123e4567-e89b-12d3-a456-426614174000' not found.",
  "errorCode": "ORGS_PROFILE_001",
  "timestamp": "2025-10-25T12:34:56.789Z",
  "path": "/orgs/123e4567-e89b-12d3-a456-426614174000"
}
```

## Best Practices

1. **Use Descriptive Messages**: Error messages should explain what went wrong and include relevant identifiers
2. **Stable Error Codes**: Never change existing error codes; clients may depend on them
3. **Consistent Categorization**: Keep related errors in the same domain namespace
4. **Document New Errors**: Update this registry when adding new exceptions
5. **Context-Specific Codes**: Different contexts (CRUD vs onboarding) should use their own error codes even for similar errors

## Notes

- **Duplicate Exception Classes**: `OrganizationAlreadyExistsException` exists in both `common/exceptions` and `onboarding/errors` with different error codes. This is intentional - they serve different contexts and allow clients to distinguish between CRUD duplicate errors and onboarding workflow errors.
- **Error Code Stability**: Error codes are considered part of the API contract and should not be changed without versioning
