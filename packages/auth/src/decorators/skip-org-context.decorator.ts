import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for skipping org context validation
 */
export const SKIP_ORG_CONTEXT_KEY = 'skipOrgContext';

/**
 * Decorator to skip organization context validation
 *
 * Use this for platform-level endpoints that don't require organization context,
 * such as:
 * - Platform admin operations
 * - System-wide user management
 * - Cross-organization queries
 *
 * @example
 * ```typescript
 * @Get('platform/users')
 * @SkipOrgContext()
 * @Permissions(PLATFORM_PERMISSIONS.USERS_VIEW)
 * async listAllUsers(@Query() query: ListUsersDto) {
 *   return this.usersService.listAllUsers(query);
 * }
 * ```
 */
export const SkipOrgContext = () => SetMetadata(SKIP_ORG_CONTEXT_KEY, true);
