# API Endpoints Documentation

This document outlines the API endpoints for `api-users` and `api-organizations`, including their parameters, expected request/response DTOs, permissions, and status codes. This information will be used to build type-safe API service layers in the micro-frontends.

---

## Microservice: `api-users`

### Controller: `AuthController` (`/auth` base path)

**Authentication:** All routes are public, but `POST /auth/token` uses `AuthContextTokenGuard`.

#### 1. `POST /auth/login`
*   **Description:** Step 1 of Login: Authenticate and get organization list.
*   **Parameters:** None (all in body).
*   **Headers:**
    *   `User-Agent`: (from `req.headers['user-agent']`)
    *   `X-Forwarded-For` or `Remote-Address`: (from `req.ip`)
*   **Request Body:** `AuthLoginDto` (implements `IAuthLogin` from `@verichron/types`)
    *   `email: string`
    *   `password: string`
*   **Response:** `IAuthOrganizationListResponse` (from `@verichron/types`)
    *   `organizations: IOrganizationSelection[]`
*   **Status:**
    *   `200 OK`: Authentication successful, returns organization list.
    *   `401 Unauthorized`: Invalid credentials.
*   **Permissions:** `@Public()`
*   **Notes:** Sets an `act` cookie.

#### 2. `POST /auth/token`
*   **Description:** Step 2 of Login: Exchange ACT for a scoped JWT.
*   **Parameters:** None (all in body).
*   **Headers:**
    *   `User-Agent`: (from `req.headers['user-agent']`)
    *   `X-Forwarded-For` or `Remote-Address`: (from `req.ip`)
    *   `Cookie`: Must contain `act` (Authentication Context Token).
*   **Request Body:** `AuthTokenDto` (implements `IAuthToken` from `@verichron/types`)
    *   `organizationId?: string | null` (UUID)
    *   `fromOrganizationId?: string` (UUID)
*   **Response:** `IAuthTokenResponse` (from `@verichron/types`)
    *   `accessToken: string`
    *   `refreshToken: string`
*   **Status:**
    *   `201 Created`: JWTs created successfully.
    *   `403 Forbidden`: Invalid or expired Authentication Context Token.
*   **Permissions:** `@Public()`, but uses `AuthContextTokenGuard`.
*   **Notes:** Clears the `act` cookie.

#### 3. `POST /auth/switch-context`
*   **Description:** Get a new ACT to switch organization context.
*   **Parameters:** None.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None explicitly defined in controller, but `fromOrganizationId` is mentioned in `getToken` as potentially coming from the body when switching context.
*   **Response:** `IAuthOrganizationListResponse` (from `@verichron/types`)
    *   `organizations: IOrganizationSelection[]`
*   **Status:**
    *   `200 OK`: New context selection initiated.
*   **Permissions:** `JwtAuthGuard`
*   **Notes:** Sets a new `act` cookie.

#### 4. `POST /auth/refresh`
*   **Description:** Refresh an access token.
*   **Parameters:** None (all in body).
*   **Headers:**
    *   `User-Agent`: (from `req.headers['user-agent']`)
    *   `X-Forwarded-For` or `Remote-Address`: (from `req.ip`)
*   **Request Body:** `{ refreshToken: string }`
*   **Response:** `IAuthTokenResponse` (from `@verichron/types`)
    *   `accessToken: string`
    *   `refreshToken: string`
*   **Status:**
    *   `201 Created`: New access token generated.
    *   `401 Unauthorized`: Invalid or expired refresh token.
*   **Permissions:** `@Public()`

---

### Controller: `RbacController` (`/rbac` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`) and are protected by `PermissionsGuard`.

#### 1. `POST /rbac/roles`
*   **Description:** Create a new custom role.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateRoleDto` (implements `ICreateRole` from `@verichron/types`)
    *   `name: string`
    *   `description: string`
    *   `permissionIds?: string[]` (UUIDs)
*   **Response:** `IRoleDetail` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Role successfully created.
    *   `400 Bad Request`: Invalid input, role name exists, or platform admin attempted creation.
    *   `403 Forbidden`: Insufficient permissions.
*   **Permissions:** `role:create`

#### 2. `GET /rbac/roles`
*   **Description:** List all roles.
*   **Parameters:** Query parameters from `ListRolesQueryDto` (implements `IListRolesQuery` from `@verichron/types`)
    *   `page?: number`
    *   `limit?: number`
    *   `search?: string`
    *   `isSystemRole?: boolean`
    *   `permissionId?: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IPaginatedRolesResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Paginated list of roles.
*   **Permissions:** `role:read`

#### 3. `GET /rbac/roles/:roleId`
*   **Description:** Get role details including permissions.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IRoleDetail` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Role details.
    *   `404 Not Found`: Role not found or not in organization.
*   **Permissions:** `role:read`

#### 4. `PATCH /rbac/roles/:roleId`
*   **Description:** Update a role.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateRoleDto` (implements `IUpdateRole` from `@verichron/types`)
    *   `name?: string`
    *   `description?: string`
*   **Response:** `IRoleDetail` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Updated role.
    *   `404 Not Found`: Role not found.
    *   `400 Bad Request`: Invalid input.
*   **Permissions:** `role:update`

#### 5. `DELETE /rbac/roles/:roleId`
*   **Description:** Delete a custom role.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Role successfully deleted.
    *   `400 Bad Request`: Cannot delete system roles.
    *   `404 Not Found`: Role not found.
    *   `409 Conflict`: Cannot delete role while users are assigned to it.
*   **Permissions:** `role:delete`

#### 6. `GET /rbac/permissions`
*   **Description:** List all available platform permissions.
*   **Parameters:** Query parameters from `ListPermissionsQueryDto` (implements `IListPermissionsQuery` from `@verichron/types`)
    *   `page?: number`
    *   `limit?: number`
    *   `resource?: string`
    *   `action?: string`
    *   `search?: string`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IPaginatedPermissionsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Paginated list of permissions.
*   **Permissions:** `permission:read`

#### 7. `GET /rbac/permissions/grouped`
*   **Description:** Get permissions grouped by resource.
*   **Parameters:** None.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGroupedPermissionsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Permissions grouped by resource.
*   **Permissions:** `permission:read`

#### 8. `POST /rbac/roles/:roleId/permissions`
*   **Description:** Assign a permission to a role.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `AssignPermissionToRoleDto` (implements `IAssignPermissionToRole` from `@verichron/types`)
    *   `permissionId: string` (UUID)
*   **Response:** None.
*   **Status:**
    *   `201 Created`: Permission assigned.
    *   `404 Not Found`: Role or permission not found.
    *   `409 Conflict`: Permission already assigned.
*   **Permissions:** `role:update`

#### 9. `POST /rbac/roles/:roleId/permissions/bulk`
*   **Description:** Assign multiple permissions to a role.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `AssignPermissionsToRoleDto` (implements `IAssignPermissionsToRole` from `@verichron/types`)
    *   `permissionIds: string[]` (UUIDs)
*   **Response:** None.
*   **Status:**
    *   `201 Created`: Permissions assigned.
    *   `404 Not Found`: Role or one or more permissions not found.
*   **Permissions:** `role:update`

#### 10. `DELETE /rbac/roles/:roleId/permissions/:permissionId`
*   **Description:** Remove a permission from a role.
*   **Parameters:**
    *   Path: `roleId: string` (UUID)
    *   Path: `permissionId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Permission removed.
    *   `404 Not Found`: Role or permission not found.
*   **Permissions:** `role:update`

#### 11. `POST /rbac/users/:userId/roles`
*   **Description:** Assign a role to a user.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `AssignRoleToUserDto` (implements `IAssignRoleToUser` from `@verichron/types`)
    *   `roleId: string` (UUID)
    *   `note?: string`
*   **Response:** None.
*   **Status:**
    *   `201 Created`: Role assigned.
    *   `404 Not Found`: User or role not found.
    *   `409 Conflict`: User already has this role.
*   **Permissions:** `role:assign`

#### 12. `DELETE /rbac/users/:userId/roles/:roleId`
*   **Description:** Remove a role from a user. (Deprecated)
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `roleId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `RemoveRoleFromUserDto` (implements `IRemoveRoleFromUser` from `@verichron/types`)
    *   `roleId: string` (UUID)
    *   `note?: string`
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Role removed.
    *   `404 Not Found`: User or role not found.
    *   `400 Bad Request`: Cannot remove role.
*   **Permissions:** `role:assign`

#### 13. `POST /rbac/check-permission`
*   **Description:** Check if a user has a specific permission.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CheckPermissionDto` (assumed `ICheckPermission` from `@verichron/types`)
    *   `userId: string` (UUID)
    *   `organizationId: string` (UUID)
    *   `permissionCode: string`
*   **Response:** `IPermissionCheckResult` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Permission check result.
*   **Permissions:** Authenticated users.

#### 14. `POST /rbac/check-permissions`
*   **Description:** Check if a user has multiple permissions.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CheckPermissionsDto` (assumed `ICheckPermissions` from `@verichron/types`)
    *   `userId: string` (UUID)
    *   `organizationId: string` (UUID)
    *   `permissionCodes: string[]`
*   **Response:** `IPermissionsCheckResult` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Bulk permission check results.
*   **Permissions:** Authenticated users.

---

### Controller: `AppController` (base path `/`)

**Authentication:** `GET /health` is public, `GET /` requires authentication.

#### 1. `GET /`
*   **Description:** Returns a simple "Hello World" message.
*   **Parameters:** None.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `string`
*   **Status:**
    *   `200 OK`
*   **Permissions:** Authenticated users.

#### 2. `GET /health`
*   **Description:** Health check.
*   **Parameters:** None.
*   **Headers:** None.
*   **Request Body:** None.
*   **Response:** `{ status: string; service: string }` (assumed `IHealthCheckResponse` from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Service is healthy.
*   **Permissions:** `@Public()`

---

### Controller: `ProfilesController` (`/users` base path)

**Authentication:** All routes (except `internal/provision-initial-admin` and `activate`) require a JWT (`@ApiBearerAuth()`) and are protected by `PermissionsGuard`.

#### 1. `POST /users/internal/provision-initial-admin`
*   **Description:** Provision initial admin user for a new organization (internal).
*   **Parameters:** None (all in body).
*   **Headers:** None.
*   **Request Body:** `ProvisionInitialAdminDto` (assumed `IProvisionInitialAdmin` from `@verichron/types`)
    *   `organizationId: string` (UUID)
    *   `organizationName: string`
    *   `email: string`
    *   `firstName: string`
    *   `lastName: string`
*   **Response:** `{ id: string; email: string }` (assumed `IProvisionInitialAdminResponse` from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Initial admin user provisioned successfully.
*   **Permissions:** `@Public()`

#### 2. `GET /users`
*   **Description:** List all users.
*   **Parameters:** Query parameters from `ListUsersQueryDto` (implements `IListUsersQuery` from `@verichron/types`)
    *   `page?: number`
    *   `limit?: number`
    *   `status?: UserStatus`
    *   `search?: string`
    *   `roleId?: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IPaginatedUsersResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Paginated list of users.
*   **Permissions:** `user:read`

#### 3. `GET /users/:userId`
*   **Description:** Get user details.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IUserDetail` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: User details.
    *   `404 Not Found`: User not found or not in organization.
*   **Permissions:** `user:read`

#### 4. `POST /users`
*   **Description:** Invite a new user to your organization.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `InviteUserDto` (implements `IInviteUser` from `@verichron/types`)
    *   `email: string`
    *   `firstName: string`
    *   `lastName: string`
    *   `roleId: string` (UUID)
*   **Response:** `IUserDetail` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: User invited successfully.
    *   `400 Bad Request`: Platform admins cannot invite users.
    *   `409 Conflict`: A user with this email already exists.
*   **Permissions:** `user:create`

#### 5. `POST /users/activate`
*   **Description:** Activate user account.
*   **Parameters:** None (all in body).
*   **Headers:** None.
*   **Request Body:** `ActivateUserDto` (assumed `IActivateUser` from `@verichron/types`)
    *   `invitationToken: string`
    *   `password: string`
    *   `passwordConfirmation: string`
*   **Response:** `IUserDetail` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: User account activated successfully.
    *   `400 Bad Request`: Invalid or expired invitation token.
*   **Permissions:** `@Public()`

#### 6. `PATCH /users/:userId`
*   **Description:** Update user profile.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateUserDto` (implements `IUpdateUser` from `@verichron/types`)
    *   `firstName?: string`
    *   `lastName?: string`
    *   `status?: UserStatus`
*   **Response:** `IUserDetail` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: User updated successfully.
    *   `404 Not Found`: User not found.
*   **Permissions:** `user:update`

#### 7. `DELETE /users/:userId`
*   **Description:** Delete user account (soft delete).
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: User deleted successfully.
    *   `404 Not Found`: User not found.
*   **Permissions:** `user:delete`

#### 8. `GET /users/:userId/addresses`
*   **Description:** Get user addresses.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IUserAddressResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: List of user addresses.
*   **Permissions:** `user:read`

#### 9. `POST /users/:userId/addresses`
*   **Description:** Add address to user.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateAddressDto` (implements `IUserAddressCreate` from `@verichron/types`)
    *   `isPrimary?: boolean`
    *   `street1: string`
    *   `street2?: string`
    *   `city: string`
    *   `state: string`
    *   `postalCode: string`
    *   `country: string`
    *   `category?: AddressCategory`
*   **Response:** `IUserAddressResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Address added successfully.
*   **Permissions:** `user:update`

#### 10. `PUT /users/:userId/addresses/:addressId`
*   **Description:** Update user address.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `addressId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateAddressDto` (implements `IUserAddressUpdate` from `@verichron/types`)
    *   `isPrimary?: boolean`
    *   `street1?: string`
    *   `street2?: string`
    *   `city?: string`
    *   `state?: string`
    *   `postalCode?: string`
    *   `country?: string`
    *   `category?: AddressCategory`
*   **Response:** `IUserAddressResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Address updated successfully.
*   **Permissions:** `user:update`

#### 11. `DELETE /users/:userId/addresses/:addressId`
*   **Description:** Delete user address.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `addressId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Address deleted successfully.
*   **Permissions:** `user:update`

#### 12. `GET /users/:userId/emails`
*   **Description:** Get user emails.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IUserEmailResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: List of user emails.
*   **Permissions:** `user:read`

#### 13. `POST /users/:userId/emails`
*   **Description:** Add email to user.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateEmailDto` (implements `IUserEmailCreate` from `@verichron/types`)
    *   `email: string`
    *   `isPrimary?: boolean`
*   **Response:** `IUserEmailResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Email added successfully.
*   **Permissions:** `user:update`

#### 14. `PUT /users/:userId/emails/:emailId`
*   **Description:** Update user email.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `emailId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateEmailDto` (implements `IUserEmailUpdate` from `@verichron/types`)
    *   `isPrimary: boolean`
*   **Response:** `IUserEmailResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Email updated successfully.
*   **Permissions:** `user:update`

#### 15. `DELETE /users/:userId/emails/:emailId`
*   **Description:** Delete user email.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `emailId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Email deleted successfully.
*   **Permissions:** `user:update`

#### 16. `GET /users/:userId/phones`
*   **Description:** Get user phone numbers.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IUserPhoneNumberResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: List of user phone numbers.
*   **Permissions:** `user:read`

#### 17. `POST /users/:userId/phones`
*   **Description:** Add phone number to user.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreatePhoneNumberDto` (implements `IUserPhoneNumberCreate` from `@verichron/types`)
    *   `phoneNumber: string`
    *   `isPrimary?: boolean`
    *   `category?: PhoneCategory`
*   **Response:** `IUserPhoneNumberResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Phone number added successfully.
*   **Permissions:** `user:update`

#### 18. `PUT /users/:userId/phones/:phoneId`
*   **Description:** Update user phone number.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `phoneId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdatePhoneNumberDto` (implements `IUserPhoneNumberUpdate` from `@verichron/types`)
    *   `isPrimary?: boolean`
    *   `category?: PhoneCategory`
*   **Response:** `IUserPhoneNumberResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Phone number updated successfully.
*   **Permissions:** `user:update`

#### 19. `DELETE /users/:userId/phones/:phoneId`
*   **Description:** Delete user phone number.
*   **Parameters:**
    *   Path: `userId: string` (UUID)
    *   Path: `phoneId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Phone number deleted successfully.
*   **Permissions:** `user:update`

---

## Microservice: `api-organizations`

### Controller: `AnalyticsController` (`/orgs/:orgId` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`).

#### 1. `GET /orgs/:orgId/dashboard-summary`
*   **Description:** Get high-level dashboard KPIs aggregated from multiple microservices.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IDashboardSummaryResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Dashboard summary retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from dependent services.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 2. `GET /orgs/:orgId/analytics/recovery-trends`
*   **Description:** Get recovery rate trends over time with configurable granularity.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `RecoveryTrendsQueryDto` (implements `IRecoveryTrendsQuery` from `@verichron/types`)
        *   `startDate?: Date`
        *   `endDate?: Date`
        *   `granularity?: TrendGranularity`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IRecoveryTrendsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Recovery trends retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid query parameters.
    *   `503 Service Unavailable`: Unable to aggregate data from api-transactions.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 3. `GET /orgs/:orgId/analytics/portfolio-performance`
*   **Description:** Get portfolio-level performance metrics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IPortfolioPerformanceResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Portfolio performance retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debts or api-transactions.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 4. `GET /orgs/:orgId/analytics/geographic/debt-age`
*   **Description:** Get debt age geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
        *   `states?: string[]`
        *   `portfolioId?: string`
        *   `portfolioName?: string`
        *   `portfolioType?: PortfolioType`
        *   `debtAgeMin?: number`
        *   `debtAgeMax?: number`
        *   `debtAgeBucket?: DebtAgeBucket`
        *   `hasPaymentPlan?: boolean`
        *   `isResponsive?: boolean`
        *   `likelihoodToPayMin?: number`
        *   `defaultRiskMax?: number`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicDebtAgeAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Debt age geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debts.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 5. `GET /orgs/:orgId/analytics/geographic/creditors`
*   **Description:** Get creditor geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicCreditorAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Creditor geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debts.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 6. `GET /orgs/:orgId/analytics/geographic/debtors`
*   **Description:** Get debtor geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicDebtorAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Debtor geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debtors.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 7. `GET /orgs/:orgId/analytics/geographic/default-risk`
*   **Description:** Get default risk geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicDefaultRiskAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Default risk geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debtors.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 8. `GET /orgs/:orgId/analytics/geographic/likelihood-to-pay`
*   **Description:** Get likelihood to pay geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicLikelihoodToPayAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Likelihood to pay geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-debtors.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 9. `GET /orgs/:orgId/analytics/geographic/payment-plans`
*   **Description:** Get payment plan geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicPaymentPlanAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Payment plan geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-transactions.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 10. `GET /orgs/:orgId/analytics/geographic/responsiveness`
*   **Description:** Get debtor responsiveness geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IGeographicResponsivenessAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Responsiveness geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from api-communications.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 11. `GET /orgs/:orgId/analytics/geographic/combined`
*   **Description:** Get combined geographic analytics.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Query: `GeographicQueryDto` (implements `IGeographicQuery` from `@verichron/types`)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `ICombinedGeographicAnalytics` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Combined geographic analytics retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `503 Service Unavailable`: Unable to aggregate data from multiple services.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

---

### Controller: `AppController` (base path `/`)

**Authentication:** `GET /health` is public, `GET /` requires authentication.

#### 1. `GET /`
*   **Description:** Returns a simple "Hello World" message.
*   **Parameters:** None.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `string`
*   **Status:**
    *   `200 OK`
*   **Permissions:** Authenticated users.

#### 2. `GET /health`
*   **Description:** Health check.
*   **Parameters:** None.
*   **Headers:** None.
*   **Request Body:** None.
*   **Response:** `{ status: string; service: string }` (assumed `IHealthCheckResponse` from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Service is healthy.
*   **Permissions:** `@Public()`

---

### Controller: `OnboardingController` (base path `/`)

**Authentication:** Most routes require a JWT (`@ApiBearerAuth()`) and `PermissionsGuard`.

#### 1. `POST /onboarding`
*   **Description:** Provision a new organization with initial admin user (platform admin only). Orchestrates creation across multiple services.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `ProvisionOrganizationDto` (implements `IProvisionOrganization` from `@verichron/types`)
    *   `organization: ICreateOrganization`
    *   `initialAdmin: IInitialAdminUser`
    *   `defaultSettings?: Record<string, any>`
    *   `createdBy?: string` (UUID)
*   **Response:** `IOnboardingResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Organization provisioned successfully.
    *   `400 Bad Request`: Invalid input data.
    *   `409 Conflict`: Organization already exists.
    *   `403 Forbidden`: Platform admin role required.
    *   `401 Unauthorized`: Not authenticated.
*   **Permissions:** `PLATFORM_PERMISSIONS.ORGS_CREATE`

#### 2. `GET /onboarding/:orgId/status`
*   **Description:** Check the onboarding status for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IOnboardingStatusResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Onboarding status retrieved successfully.
    *   `404 Not Found`: Organization not found.
    *   `401 Unauthorized`: Not authenticated.
*   **Permissions:** Authenticated users.

#### 3. `POST /internal/activate-organization`
*   **Description:** Activate an organization (internal). Deprecated.
*   **Parameters:** None (all in body).
*   **Headers:** None.
*   **Request Body:** `ActivateOrganizationDto` (implements `IActivateOrganization` from `@verichron/types`)
    *   `organizationId: string` (UUID)
    *   `updatedBy: string` (UUID)
    *   `reason: string`
*   **Response:** `{ success: boolean }`
*   **Status:**
    *   `200 OK`: Organization activated.
*   **Permissions:** `@Public()`

---

### Controller: `SettingsController` (`/orgs/:orgId/settings` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`).

#### 1. `GET /orgs/:orgId/settings`
*   **Description:** Retrieve current organization settings (JSONB).
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `ISettingsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Settings retrieved successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 2. `PATCH /orgs/:orgId/settings`
*   **Description:** Partially update organization settings.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateSettingsDto` (implements `IUpdateSettings` from `@verichron/types`)
    *   `settings: IFullSettings`
*   **Response:** `ISettingsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Settings updated successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid settings data.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

#### 3. `PUT /orgs/:orgId/settings`
*   **Description:** Completely replace organization settings.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `ReplaceSettingsDto` (implements `IReplaceSettings` from `@verichron/types`)
    *   `settings: IFullSettings`
*   **Response:** `ISettingsResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Settings replaced successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid settings data.
*   **Permissions:** Implied by `@ApiBearerAuth()`.

---

### Controller: `ProfilesController` (`/orgs` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`) and are protected by `JwtAuthGuard`. Some also use `PermissionsGuard` or `Roles` decorators.

#### 1. `POST /orgs`
*   **Description:** Create a new organization.
*   **Parameters:** None (all in body).
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateOrganizationDto` (implements `ICreateOrganization` from `@verichron/types`)
    *   `name: string`
    *   `displayName?: string`
    *   `organizationType: OrganizationType`
    *   `parentOrganizationId?: string` (UUID)
    *   `taxId?: string`
    *   `settings?: Record<string, any>`
*   **Response:** `IOrganizationResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Organization successfully created.
    *   `400 Bad Request`: Invalid input data.
    *   `409 Conflict`: Organization already exists.
*   **Permissions:** `PLATFORM_PERMISSIONS.ORGS_CREATE`

#### 2. `GET /orgs`
*   **Description:** Get a paginated list of organizations with optional filters and search.
*   **Parameters:** Query parameters from `OrganizationQueryDto` (implements `IOrganizationQuery` from `@verichron/types`)
    *   `page?: number`
    *   `pageSize?: number`
    *   `search?: string`
    *   `name?: string`
    *   `organizationType?: OrganizationType`
    *   `status?: OrganizationStatus`
    *   `parentOrganizationId?: string` (UUID)
    *   `topLevelOnly?: boolean`
    *   `sortBy?: string`
    *   `sortOrder?: 'ASC' | 'DESC'`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IPaginatedResponse<IOrganizationResponse>` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Organizations retrieved successfully.
    *   `400 Bad Request`: Invalid query parameters.
*   **Permissions:** Authenticated users.

#### 3. `GET /orgs/:orgId`
*   **Description:** Retrieve a single organization with all details.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IOrganizationResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Organization retrieved successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** Authenticated users.

#### 4. `PATCH /orgs/:orgId`
*   **Description:** Partially update an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateOrganizationDto` (implements `IUpdateOrganization` from `@verichron/types`)
    *   `name?: string`
    *   `displayName?: string`
    *   `organizationType?: OrganizationType`
    *   `parentOrganizationId?: string` (UUID)
    *   `taxId?: string`
    *   `settings?: Record<string, any>`
    *   `status?: OrganizationStatus`
*   **Response:** `IOrganizationResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Organization updated successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** `PLATFORM_PERMISSIONS.ORGS_UPDATE`

#### 5. `DELETE /orgs/:orgId`
*   **Description:** Soft delete an organization by setting status to INACTIVE.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Organization deleted successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** `OrganizationRole.ORG_ADMIN`

#### 6. `GET /orgs/:orgId/addresses`
*   **Description:** Get all addresses for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IOrganizationAddressResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Addresses retrieved successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** Authenticated users.

#### 7. `POST /orgs/:orgId/addresses`
*   **Description:** Create a new address for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateAddressDto` (implements `IOrganizationAddressCreate` from `@verichron/types`)
    *   `street1: string`
    *   `street2?: string`
    *   `street3?: string`
    *   `city: string`
    *   `state: string`
    *   `postalCode: string`
    *   `country: string`
    *   `latitude?: number`
    *   `longitude?: number`
    *   `isPrimary?: boolean`
    *   `addressCategory: AddressCategory`
*   **Response:** `IOrganizationAddressResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Address created successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 8. `PATCH /orgs/:orgId/addresses/:addressId`
*   **Description:** Partially update an organization address.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `addressId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateAddressDto` (implements `IOrganizationAddressUpdate` from `@verichron/types`)
    *   `street1?: string`
    *   `street2?: string`
    *   `street3?: string`
    *   `city?: string`
    *   `state?: string`
    *   `postalCode?: string`
    *   `country?: string`
    *   `latitude?: number`
    *   `longitude?: number`
    *   `isPrimary?: boolean`
    *   `addressCategory?: AddressCategory`
*   **Response:** `IOrganizationAddressResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Address updated successfully.
    *   `404 Not Found`: Organization or address not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 9. `DELETE /orgs/:orgId/addresses/:addressId`
*   **Description:** Delete an address from an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `addressId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Address deleted successfully.
    *   `404 Not Found`: Organization or address not found.
*   **Permissions:** Authenticated users.

#### 10. `GET /orgs/:orgId/emails`
*   **Description:** Get all emails for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IOrganizationEmailResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Emails retrieved successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** Authenticated users.

#### 11. `POST /orgs/:orgId/emails`
*   **Description:** Create a new email for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreateEmailDto` (implements `IOrganizationEmailCreate` from `@verichron/types`)
    *   `email: string`
    *   `isPrimary?: boolean`
    *   `isVerified?: boolean`
    *   `emailCategory?: EmailCategory`
    *   `validFrom?: Date`
    *   `validTo?: Date`
*   **Response:** `IOrganizationEmailResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Email created successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 12. `PATCH /orgs/:orgId/emails/:emailId`
*   **Description:** Partially update an organization email.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `emailId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdateEmailDto` (implements `IOrganizationEmailUpdate` from `@verichron/types`)
    *   `email?: string`
    *   `isPrimary?: boolean`
    *   `isVerified?: boolean`
    *   `emailCategory?: EmailCategory`
    *   `validFrom?: Date`
    *   `validTo?: Date`
*   **Response:** `IOrganizationEmailResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Email updated successfully.
    *   `404 Not Found`: Organization or email not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 13. `DELETE /orgs/:orgId/emails/:emailId`
*   **Description:** Delete an email from an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `emailId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Email deleted successfully.
    *   `404 Not Found`: Organization or email not found.
*   **Permissions:** Authenticated users.

#### 14. `GET /orgs/:orgId/phone-numbers`
*   **Description:** Get all phone numbers for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** `IOrganizationPhoneNumberResponse[]` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Phone numbers retrieved successfully.
    *   `404 Not Found`: Organization not found.
*   **Permissions:** Authenticated users.

#### 15. `POST /orgs/:orgId/phone-numbers`
*   **Description:** Create a new phone number for an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `CreatePhoneNumberDto` (implements `IOrganizationPhoneNumberCreate` from `@verichron/types`)
    *   `phoneNumber: string`
    *   `extension?: string`
    *   `isPrimary?: boolean`
    *   `isVerified?: boolean`
    *   `category: PhoneCategory`
    *   `validFrom?: Date`
    *   `validTo?: Date`
*   **Response:** `IOrganizationPhoneNumberResponse` (from `@verichron/types`)
*   **Status:**
    *   `201 Created`: Phone number created successfully.
    *   `404 Not Found`: Organization not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 16. `PATCH /orgs/:orgId/phone-numbers/:phoneNumberId`
*   **Description:** Partially update an organization phone number.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `phoneNumberId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** `UpdatePhoneNumberDto` (implements `IOrganizationPhoneNumberUpdate` from `@verichron/types`)
    *   `phoneNumber?: string`
    *   `extension?: string`
    *   `isPrimary?: boolean`
    *   `isVerified?: boolean`
    *   `category?: PhoneCategory`
    *   `validFrom?: Date`
    *   `validTo?: Date`
*   **Response:** `IOrganizationPhoneNumberResponse` (from `@verichron/types`)
*   **Status:**
    *   `200 OK`: Phone number updated successfully.
    *   `404 Not Found`: Organization or phone number not found.
    *   `400 Bad Request`: Invalid input data.
*   **Permissions:** Authenticated users.

#### 17. `DELETE /orgs/:orgId/phone-numbers/:phoneNumberId`
*   **Description:** Delete a phone number from an organization.
*   **Parameters:**
    *   Path: `orgId: string` (UUID)
    *   Path: `phoneNumberId: string` (UUID)
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Body:** None.
*   **Response:** None.
*   **Status:**
    *   `204 No Content`: Phone number deleted successfully.
    *   `404 Not Found`: Organization or phone number not found.
*   **Permissions:** Authenticated users.

---

### Controller: `TeamsController` (`/organizations/:organizationId/teams` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`) and are protected by `JwtAuthGuard`.

#### 1. `POST /organizations/:organizationId/teams`
*   **Description:** Create a new team within an organization.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
*   **Request Body:** `CreateTeamDto`
    *   `name: string`
    *   `description?: string`
    *   `managerId?: string` (UUID)
*   **Response:** `TeamResponseDto`
*   **Status:**
    *   `201 Created`: Team successfully created.
*   **Permissions:** `OrganizationPermission.TEAMS_MANAGE`

#### 2. `GET /organizations/:organizationId/teams`
*   **Description:** List all teams for an organization.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
*   **Response:** `TeamResponseDto[]`
*   **Status:**
    *   `200 OK`: Teams retrieved successfully.
*   **Permissions:** `OrganizationPermission.TEAMS_READ`

#### 3. `GET /organizations/:organizationId/teams/:teamId`
*   **Description:** Get a single team with details.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `teamId: string` (UUID)
*   **Response:** `TeamResponseDto`
*   **Status:**
    *   `200 OK`: Team retrieved successfully.
*   **Permissions:** `OrganizationPermission.TEAMS_READ`

#### 4. `PATCH /organizations/:organizationId/teams/:teamId`
*   **Description:** Update a team's name, description, or manager.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `teamId: string` (UUID)
*   **Request Body:** `UpdateTeamDto`
*   **Response:** `TeamResponseDto`
*   **Status:**
    *   `200 OK`: Team successfully updated.
*   **Permissions:** `OrganizationPermission.TEAMS_MANAGE`

#### 5. `DELETE /organizations/:organizationId/teams/:teamId`
*   **Description:** Delete a team and its memberships.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `teamId: string` (UUID)
*   **Status:**
    *   `204 No Content`: Team successfully deleted.
*   **Permissions:** `OrganizationPermission.TEAMS_MANAGE`

#### 6. `POST /organizations/:organizationId/teams/:teamId/members`
*   **Description:** Add a member to a team.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `teamId: string` (UUID)
*   **Request Body:** `AddTeamMemberDto`
    *   `userId: string` (UUID)
    *   `role?: TeamMemberRole`
    *   `isPrimary?: boolean`
*   **Response:** `TeamMemberResponseDto`
*   **Permissions:** `OrganizationPermission.TEAMS_MANAGE`

#### 7. `GET /organizations/:organizationId/teams/user/:userId`
*   **Description:** Get all teams a user belongs to within the organization.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `userId: string` (UUID)
*   **Response:** `TeamResponseDto[]`
*   **Permissions:** `OrganizationPermission.TEAMS_READ`

---

## Microservice: `api-collectors`

### Controller: `WorkstationController` (`/organizations/:organizationId/workstation` base path)

**Authentication:** All routes require a JWT (`@ApiBearerAuth()`) and use `TeamAccessGuard`.

#### 1. `GET /organizations/:organizationId/workstation/debtors/:debtorProfileId/focus`
*   **Description:** Get comprehensive debtor focus view (360 aggregated view).
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `debtorProfileId: string` (UUID)
*   **Permissions:** `OrganizationPermission.DEBTORS_READ`

#### 2. `POST /organizations/:organizationId/workstation/debtors/:debtorProfileId/actions`
*   **Description:** Log a collector action (note, call, email, etc.) on a debtor.
*   **Parameters:**
    *   Path: `organizationId: string` (UUID)
    *   Path: `debtorProfileId: string` (UUID)
*   **Request Body:** `LogDebtorActionDto`
*   **Permissions:** `OrganizationPermission.DEBTORS_WRITE`

---

### Controller: `CollectorProfileController` (`/organizations/:organizationId/profiles` base path)

#### 1. `GET /organizations/:organizationId/profiles`
*   **Description:** List all collector profiles for an organization.
*   **Permissions:** `OrganizationPermission.USERS_READ`

#### 2. `PATCH /organizations/:organizationId/profiles/:profileId/status`
*   **Description:** Update collector availability status (e.g., AVAILABLE, BUSY, OFFLINE).
*   **Permissions:** `OrganizationPermission.USERS_WRITE`

---

### Controller: `PerformanceController` (`/organizations/:organizationId/performance` base path)

#### 1. `GET /organizations/:organizationId/performance/stats/today`
*   **Description:** Get today's performance stats for the authenticated collector.
*   **Permissions:** `OrganizationPermission.ANALYTICS_READ`

#### 2. `GET /organizations/:organizationId/performance/leaderboard`
*   **Description:** Get team leaderboard with rankings.
*   **Parameters:**
    *   Query: `period: TrendGranularity`
    *   Query: `teamId?: string` (UUID)
*   **Permissions:** `OrganizationPermission.ANALYTICS_READ`

---

## Internal Service-to-Service Endpoints

These endpoints are used by orchestrators and are protected by `X-Internal-API-Key` headers.

### `api-debts` Internal Analytics
*   `GET /internal/creditors/analytics/geographic-flows/:organizationId`: Actual creditor→debtor flows.
*   `GET /internal/creditors/analytics/creditor-summary/:organizationId`: Aggregate creditor stats.

### `api-transactions` Internal Analytics
*   `GET /internal/transactions/analytics/summary/:organizationId`: Transaction volume and recovery rates.

---

The `libs/api-client` package will provide a `createConfiguredApiClient` function that returns an `AxiosInstance`. Each micro-frontend will then create its own domain-specific service layers that utilize this `AxiosInstance` to make type-safe API calls.

Here's how the API client structure is envisioned for `apps/ui-platform` and `apps/ui-organizations`:

### `apps/ui-platform/src/services/`

```
services/
├── index.ts
├── apiClient.ts             // Configures Axios instance for api-users
├── authService.ts           // Handles authentication related calls to api-users
├── rbacService.ts           // Handles RBAC related calls to api-users
└── userService.ts           // Handles user profile related calls to api-users
```

**`apps/ui-platform/src/services/authService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  IAuthLogin, 
  IAuthOrganizationListResponse, 
  IAuthToken, 
  IAuthTokenResponse 
} from '@verichron/types/contracts/api-users/auth';

const authApiClient = createConfiguredApiClient(import.meta.env.VITE_API_USERS_URL);

export const authService = {
  login: async (credentials: IAuthLogin): Promise<IAuthOrganizationListResponse> => {
    const response = await authApiClient.post<IAuthOrganizationListResponse>('/auth/login', credentials);
    return response.data;
  },
  getToken: async (tokenRequest: IAuthToken): Promise<IAuthTokenResponse> => {
    const response = await authApiClient.post<IAuthTokenResponse>('/auth/token', tokenRequest);
    return response.data;
  },
  switchContext: async (): Promise<IAuthOrganizationListResponse> => {
    const response = await authApiClient.post<IAuthOrganizationListResponse>('/auth/switch-context');
    return response.data;
  },
  refreshToken: async (refreshToken: string): Promise<IAuthTokenResponse> => {
    const response = await authApiClient.post<IAuthTokenResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },
};
```

**`apps/ui-platform/src/services/rbacService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  ICreateRole, 
  IRoleDetail, 
  IListRolesQuery, 
  IPaginatedRolesResponse,
  IUpdateRole,
  IListPermissionsQuery,
  IPaginatedPermissionsResponse,
  IGroupedPermissionsResponse,
  IAssignPermissionToRole,
  IAssignPermissionsToRole,
  IAssignRoleToUser,
  IRemoveRoleFromUser,
  ICheckPermission,
  IPermissionCheckResult,
  ICheckPermissions,
  IPermissionsCheckResult
} from '@verichron/types/contracts/api-users/rbac'; // Assuming these are correctly structured

const rbacApiClient = createConfiguredApiClient(import.meta.env.VITE_API_USERS_URL);

export const rbacService = {
  createRole: async (roleData: ICreateRole): Promise<IRoleDetail> => {
    const response = await rbacApiClient.post<IRoleDetail>('/rbac/roles', roleData);
    return response.data;
  },
  listRoles: async (query?: IListRolesQuery): Promise<IPaginatedRolesResponse> => {
    const response = await rbacApiClient.get<IPaginatedRolesResponse>('/rbac/roles', { params: query });
    return response.data;
  },
  getRoleById: async (roleId: string): Promise<IRoleDetail> => {
    const response = await rbacApiClient.get<IRoleDetail>(`/rbac/roles/${roleId}`);
    return response.data;
  },
  updateRole: async (roleId: string, roleData: IUpdateRole): Promise<IRoleDetail> => {
    const response = await rbacApiClient.patch<IRoleDetail>(`/rbac/roles/${roleId}`, roleData);
    return response.data;
  },
  deleteRole: async (roleId: string): Promise<void> => {
    await rbacApiClient.delete(`/rbac/roles/${roleId}`);
  },
  listPermissions: async (query?: IListPermissionsQuery): Promise<IPaginatedPermissionsResponse> => {
    const response = await rbacApiClient.get<IPaginatedPermissionsResponse>('/rbac/permissions', { params: query });
    return response.data;
  },
  getGroupedPermissions: async (): Promise<IGroupedPermissionsResponse> => {
    const response = await rbacApiClient.get<IGroupedPermissionsResponse>('/rbac/permissions/grouped');
    return response.data;
  },
  assignPermissionToRole: async (roleId: string, assignDto: IAssignPermissionToRole): Promise<void> => {
    await rbacApiClient.post(`/rbac/roles/${roleId}/permissions`, assignDto);
  },
  assignPermissionsToRoleBulk: async (roleId: string, assignDto: IAssignPermissionsToRole): Promise<void> => {
    await rbacApiClient.post(`/rbac/roles/${roleId}/permissions/bulk`, assignDto);
  },
  removePermissionFromRole: async (roleId: string, permissionId: string): Promise<void> => {
    await rbacApiClient.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`);
  },
  assignRoleToUser: async (userId: string, assignDto: IAssignRoleToUser): Promise<void> => {
    await rbacApiClient.post(`/rbac/users/${userId}/roles`, assignDto);
  },
  removeRoleFromUser: async (userId: string, roleId: string, removeDto: IRemoveRoleFromUser): Promise<void> => {
    await rbacApiClient.delete(`/rbac/users/${userId}/roles/${roleId}`, { data: removeDto });
  },
  checkPermission: async (checkDto: ICheckPermission): Promise<IPermissionCheckResult> => {
    const response = await rbacApiClient.post<IPermissionCheckResult>('/rbac/check-permission', checkDto);
    return response.data;
  },
  checkPermissions: async (checkDto: ICheckPermissions): Promise<IPermissionsCheckResult> => {
    const response = await rbacApiClient.post<IPermissionsCheckResult>('/rbac/check-permissions', checkDto);
    return response.data;
  },
};
```

**`apps/ui-platform/src/services/userService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  IProvisionInitialAdmin, 
  IProvisionInitialAdminResponse, // Assuming this interface exists
  IListUsersQuery, 
  IPaginatedUsersResponse,
  IUserDetail,
  IInviteUser,
  IActivateUser, // Assuming this interface exists
  IUpdateUser,
  IUserAddressResponse,
  IUserAddressCreate,
  IUserAddressUpdate,
  IUserEmailResponse,
  IUserEmailCreate,
  IUserEmailUpdate,
  IUserPhoneNumberResponse,
  IUserPhoneNumberCreate,
  IUserPhoneNumberUpdate
} from '@verichron/types/contracts/api-users/profiles'; // Assuming these are correctly structured

const userApiClient = createConfiguredApiClient(import.meta.env.VITE_API_USERS_URL);

export const userService = {
  provisionInitialAdmin: async (dto: IProvisionInitialAdmin): Promise<IProvisionInitialAdminResponse> => {
    const response = await userApiClient.post<IProvisionInitialAdminResponse>('/users/internal/provision-initial-admin', dto);
    return response.data;
  },
  listUsers: async (query?: IListUsersQuery): Promise<IPaginatedUsersResponse> => {
    const response = await userApiClient.get<IPaginatedUsersResponse>('/users', { params: query });
    return response.data;
  },
  getUserById: async (userId: string): Promise<IUserDetail> => {
    const response = await userApiClient.get<IUserDetail>(`/users/${userId}`);
    return response.data;
  },
  inviteUser: async (dto: IInviteUser): Promise<IUserDetail> => {
    const response = await userApiClient.post<IUserDetail>('/users', dto);
    return response.data;
  },
  activateUser: async (dto: IActivateUser): Promise<IUserDetail> => {
    const response = await userApiClient.post<IUserDetail>('/users/activate', dto);
    return response.data;
  },
  updateUser: async (userId: string, dto: IUpdateUser): Promise<IUserDetail> => {
    const response = await userApiClient.patch<IUserDetail>(`/users/${userId}`, dto);
    return response.data;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await userApiClient.delete(`/users/${userId}`);
  },
  getUserAddresses: async (userId: string): Promise<IUserAddressResponse[]> => {
    const response = await userApiClient.get<IUserAddressResponse[]>(`/users/${userId}/addresses`);
    return response.data;
  },
  addAddress: async (userId: string, dto: IUserAddressCreate): Promise<IUserAddressResponse> => {
    const response = await userApiClient.post<IUserAddressResponse>(`/users/${userId}/addresses`, dto);
    return response.data;
  },
  updateAddress: async (userId: string, addressId: string, dto: IUserAddressUpdate): Promise<IUserAddressResponse> => {
    const response = await userApiClient.put<IUserAddressResponse>(`/users/${userId}/addresses/${addressId}`, dto);
    return response.data;
  },
  deleteAddress: async (userId: string, addressId: string): Promise<void> => {
    await userApiClient.delete(`/users/${userId}/addresses/${addressId}`);
  },
  getUserEmails: async (userId: string): Promise<IUserEmailResponse[]> => {
    const response = await userApiClient.get<IUserEmailResponse[]>(`/users/${userId}/emails`);
    return response.data;
  },
  addEmail: async (userId: string, dto: IUserEmailCreate): Promise<IUserEmailResponse> => {
    const response = await userApiClient.post<IUserEmailResponse>(`/users/${userId}/emails`, dto);
    return response.data;
  },
  updateEmail: async (userId: string, emailId: string, dto: IUserEmailUpdate): Promise<IUserEmailResponse> => {
    const response = await userApiClient.put<IUserEmailResponse>(`/users/${userId}/emails/${emailId}`, dto);
    return response.data;
  },
  deleteEmail: async (userId: string, emailId: string): Promise<void> => {
    await userApiClient.delete(`/users/${userId}/emails/${emailId}`);
  },
  getUserPhoneNumbers: async (userId: string): Promise<IUserPhoneNumberResponse[]> => {
    const response = await userApiClient.get<IUserPhoneNumberResponse[]>(`/users/${userId}/phones`);
    return response.data;
  },
  addPhoneNumber: async (userId: string, dto: IUserPhoneNumberCreate): Promise<IUserPhoneNumberResponse> => {
    const response = await userApiClient.post<IUserPhoneNumberResponse>(`/users/${userId}/phones`, dto);
    return response.data;
  },
  updatePhoneNumber: async (userId: string, phoneId: string, dto: IUserPhoneNumberUpdate): Promise<IUserPhoneNumberResponse> => {
    const response = await userApiClient.put<IUserPhoneNumberResponse>(`/users/${userId}/phones/${phoneId}`, dto);
    return response.data;
  },
  deletePhoneNumber: async (userId: string, phoneId: string): Promise<void> => {
    await userApiClient.delete(`/users/${userId}/phones/${phoneId}`);
  },
};
```

### `apps/ui-organizations/src/services/`

```
services/
├── index.ts
├── apiClient.ts             // Configures Axios instance for api-organizations
├── analyticsService.ts      // Handles analytics related calls to api-organizations
├── onboardingService.ts     // Handles onboarding related calls to api-organizations
├── settingsService.ts       // Handles settings related calls to api-organizations
└── organizationService.ts   // Handles organization profile related calls to api-organizations
```

**`apps/ui-organizations/src/services/analyticsService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  IDashboardSummaryResponse,
  IRecoveryTrendsQuery,
  IRecoveryTrendsResponse,
  IPortfolioPerformanceResponse,
  IGeographicQuery,
  IGeographicDebtAgeAnalytics,
  IGeographicCreditorAnalytics,
  IGeographicDebtorAnalytics,
  IGeographicDefaultRiskAnalytics,
  IGeographicLikelihoodToPayAnalytics,
  IGeographicPaymentPlanAnalytics,
  IGeographicResponsivenessAnalytics,
  ICombinedGeographicAnalytics
} from '@verichron/types/contracts/api-organizations/analytics'; // Assuming these are correctly structured

const analyticsApiClient = createConfiguredApiClient(import.meta.env.VITE_API_ORGANIZATIONS_URL);

export const analyticsService = {
  getDashboardSummary: async (orgId: string): Promise<IDashboardSummaryResponse> => {
    const response = await analyticsApiClient.get<IDashboardSummaryResponse>(`/orgs/${orgId}/dashboard-summary`);
    return response.data;
  },
  getRecoveryTrends: async (orgId: string, query?: IRecoveryTrendsQuery): Promise<IRecoveryTrendsResponse> => {
    const response = await analyticsApiClient.get<IRecoveryTrendsResponse>(`/orgs/${orgId}/analytics/recovery-trends`, { params: query });
    return response.data;
  },
  getPortfolioPerformance: async (orgId: string): Promise<IPortfolioPerformanceResponse> => {
    const response = await analyticsApiClient.get<IPortfolioPerformanceResponse>(`/orgs/${orgId}/analytics/portfolio-performance`);
    return response.data;
  },
  getDebtAgeGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicDebtAgeAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicDebtAgeAnalytics>(`/orgs/${orgId}/analytics/geographic/debt-age`, { params: query });
    return response.data;
  },
  getCreditorGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicCreditorAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicCreditorAnalytics>(`/orgs/${orgId}/analytics/geographic/creditors`, { params: query });
    return response.data;
  },
  getDebtorGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicDebtorAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicDebtorAnalytics>(`/orgs/${orgId}/analytics/geographic/debtors`, { params: query });
    return response.data;
  },
  getDefaultRiskGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicDefaultRiskAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicDefaultRiskAnalytics>(`/orgs/${orgId}/analytics/geographic/default-risk`, { params: query });
    return response.data;
  },
  getLikelihoodToPayGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicLikelihoodToPayAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicLikelihoodToPayAnalytics>(`/orgs/${orgId}/analytics/geographic/likelihood-to-pay`, { params: query });
    return response.data;
  },
  getPaymentPlanGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicPaymentPlanAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicPaymentPlanAnalytics>(`/orgs/${orgId}/analytics/geographic/payment-plans`, { params: query });
    return response.data;
  },
  getResponsivenessGeographic: async (orgId: string, query?: IGeographicQuery): Promise<IGeographicResponsivenessAnalytics> => {
    const response = await analyticsApiClient.get<IGeographicResponsivenessAnalytics>(`/orgs/${orgId}/analytics/geographic/responsiveness`, { params: query });
    return response.data;
  },
  getCombinedGeographic: async (orgId: string, query?: IGeographicQuery): Promise<ICombinedGeographicAnalytics> => {
    const response = await analyticsApiClient.get<ICombinedGeographicAnalytics>(`/orgs/${orgId}/analytics/geographic/combined`, { params: query });
    return response.data;
  },
};
```

**`apps/ui-organizations/src/services/onboardingService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  IProvisionOrganization, 
  IOnboardingResponse,
  IOnboardingStatusResponse,
  IActivateOrganization
} from '@verichron/types/contracts/api-organizations/onboarding'; // Assuming these are correctly structured

const onboardingApiClient = createConfiguredApiClient(import.meta.env.VITE_API_ORGANIZATIONS_URL);

export const onboardingService = {
  provisionOrganization: async (dto: IProvisionOrganization): Promise<IOnboardingResponse> => {
    const response = await onboardingApiClient.post<IOnboardingResponse>('/onboarding', dto);
    return response.data;
  },
  getOnboardingStatus: async (orgId: string): Promise<IOnboardingStatusResponse> => {
    const response = await onboardingApiClient.get<IOnboardingStatusResponse>(`/onboarding/${orgId}/status`);
    return response.data;
  },
  activateOrganizationInternal: async (dto: IActivateOrganization): Promise<{ success: boolean }> => {
    const response = await onboardingApiClient.post<{ success: boolean }>('/internal/activate-organization', dto);
    return response.data;
  },
};
```

**`apps/ui-organizations/src/services/settingsService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  ISettingsResponse,
  IUpdateSettings,
  IReplaceSettings
} from '@verichron/types/contracts/api-organizations/settings'; // Assuming these are correctly structured

const settingsApiClient = createConfiguredApiClient(import.meta.env.VITE_API_ORGANIZATIONS_URL);

export const settingsService = {
  getSettings: async (orgId: string): Promise<ISettingsResponse> => {
    const response = await settingsApiClient.get<ISettingsResponse>(`/orgs/${orgId}/settings`);
    return response.data;
  },
  updateSettings: async (orgId: string, dto: IUpdateSettings): Promise<ISettingsResponse> => {
    const response = await settingsApiClient.patch<ISettingsResponse>(`/orgs/${orgId}/settings`, dto);
    return response.data;
  },
  replaceSettings: async (orgId: string, dto: IReplaceSettings): Promise<ISettingsResponse> => {
    const response = await settingsApiClient.put<ISettingsResponse>(`/orgs/${orgId}/settings`, dto);
    return response.data;
  },
};
```

**`apps/ui-organizations/src/services/organizationService.ts` (Example Methods)**

```typescript
import { createConfiguredApiClient } from '@verichron/api-client';
import { 
  ICreateOrganization,
  IOrganizationResponse,
  IOrganizationQuery,
  IPaginatedResponse, // Assuming this is a generic paginated response
  IUpdateOrganization,
  IOrganizationAddressResponse,
  IOrganizationAddressCreate,
  IOrganizationAddressUpdate,
  IOrganizationEmailResponse,
  IOrganizationEmailCreate,
  IOrganizationEmailUpdate,
  IOrganizationPhoneNumberResponse,
  IOrganizationPhoneNumberCreate,
  IOrganizationPhoneNumberUpdate
} from '@verichron/types/contracts/api-organizations/profiles'; // Assuming these are correctly structured

const organizationApiClient = createConfiguredApiClient(import.meta.env.VITE_API_ORGANIZATIONS_URL);

export const organizationService = {
  createOrganization: async (dto: ICreateOrganization): Promise<IOrganizationResponse> => {
    const response = await organizationApiClient.post<IOrganizationResponse>('/orgs', dto);
    return response.data;
  },
  listOrganizations: async (query?: IOrganizationQuery): Promise<IPaginatedResponse<IOrganizationResponse>> => {
    const response = await organizationApiClient.get<IPaginatedResponse<IOrganizationResponse>>('/orgs', { params: query });
    return response.data;
  },
  getOrganizationById: async (orgId: string): Promise<IOrganizationResponse> => {
    const response = await organizationApiClient.get<IOrganizationResponse>(`/orgs/${orgId}`);
    return response.data;
  },
  updateOrganization: async (orgId: string, dto: IUpdateOrganization): Promise<IOrganizationResponse> => {
    const response = await organizationApiClient.patch<IOrganizationResponse>(`/orgs/${orgId}`, dto);
    return response.data;
  },
  deleteOrganization: async (orgId: string): Promise<void> => {
    await organizationApiClient.delete(`/orgs/${orgId}`);
  },
  getOrganizationAddresses: async (orgId: string): Promise<IOrganizationAddressResponse[]> => {
    const response = await organizationApiClient.get<IOrganizationAddressResponse[]>(`/orgs/${orgId}/addresses`);
    return response.data;
  },
  addAddress: async (orgId: string, dto: IOrganizationAddressCreate): Promise<IOrganizationAddressResponse> => {
    const response = await organizationApiClient.post<IOrganizationAddressResponse>(`/orgs/${orgId}/addresses`, dto);
    return response.data;
  },
  updateAddress: async (orgId: string, addressId: string, dto: IOrganizationAddressUpdate): Promise<IOrganizationAddressResponse> => {
    const response = await organizationApiClient.patch<IOrganizationAddressResponse>(`/orgs/${orgId}/addresses/${addressId}`, dto);
    return response.data;
  },
  deleteAddress: async (orgId: string, addressId: string): Promise<void> => {
    await organizationApiClient.delete(`/orgs/${orgId}/addresses/${addressId}`);
  },
  getOrganizationEmails: async (orgId: string): Promise<IOrganizationEmailResponse[]> => {
    const response = await organizationApiClient.get<IOrganizationEmailResponse[]>(`/orgs/${orgId}/emails`);
    return response.data;
  },
  addEmail: async (orgId: string, dto: IOrganizationEmailCreate): Promise<IOrganizationEmailResponse> => {
    const response = await organizationApiClient.post<IOrganizationEmailResponse>(`/orgs/${orgId}/emails`, dto);
    return response.data;
  },
  updateEmail: async (orgId: string, emailId: string, dto: IOrganizationEmailUpdate): Promise<IOrganizationEmailResponse> => {
    const response = await organizationApiClient.patch<IOrganizationEmailResponse>(`/orgs/${orgId}/emails/${emailId}`, dto);
    return response.data;
  },
  deleteEmail: async (orgId: string, emailId: string): Promise<void> => {
    await organizationApiClient.delete(`/orgs/${orgId}/emails/${emailId}`);
  },
  getOrganizationPhoneNumbers: async (orgId: string): Promise<IOrganizationPhoneNumberResponse[]> => {
    const response = await organizationApiClient.get<IOrganizationPhoneNumberResponse[]>(`/orgs/${orgId}/phone-numbers`);
    return response.data;
  },
  addPhoneNumber: async (orgId: string, dto: IOrganizationPhoneNumberCreate): Promise<IOrganizationPhoneNumberResponse> => {
    const response = await organizationApiClient.post<IOrganizationPhoneNumberResponse>(`/orgs/${orgId}/phone-numbers`, dto);
    return response.data;
  },
  updatePhoneNumber: async (orgId: string, phoneNumberId: string, dto: IOrganizationPhoneNumberUpdate): Promise<IOrganizationPhoneNumberResponse> => {
    const response = await organizationApiClient.patch<IOrganizationPhoneNumberResponse>(`/orgs/${orgId}/phone-numbers/${phoneNumberId}`, dto);
    return response.data;
  },
  deletePhoneNumber: async (orgId: string, phoneNumberId: string): Promise<void> => {
    await organizationApiClient.delete(`/orgs/${orgId}/phone-numbers/${phoneNumberId}`);
  },
};
```
