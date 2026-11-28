/**
 * RBAC System Configuration
 *
 * This module contains the core RBAC definitions:
 * - Platform permissions
 * - Role templates
 *
 * These are used by:
 * - Production seeding (permissions + platform role)
 * - Test seeding (permissions + platform role + org roles)
 * - Runtime permission checks
 */

export * from './role-templates';
export { PLATFORM_PERMISSIONS } from '../seeding/permissions.data';
