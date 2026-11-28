import { EVENT_TYPES } from "@verichron/events";

// src/events/event-dto/constants.ts

/**
 * EVENT NAMING CONVENTION GUIDE
 * ==============================
 *
 * Use semantic verb distinctions to indicate event significance:
 *
 * **"changed"** - Lifecycle/state transitions (requires workflow logic):
 *   - Status/state transitions: status_changed, suspended, reactivated, activated
 *   - Identity changes: name_changed (key identifiers)
 *   - Relationship changes: parent_changed, owner_changed
 *   - Permission changes: permissions_changed, role_assigned
 *
 * **"updated"** - Property/data modifications (simpler data sync):
 *   - Property modifications: settings_updated, profile_updated
 *   - General field updates: organization_updated, user_updated (catch-all)
 *   - Configuration changes: preferences_updated, configuration_updated
 *
 * **Specific action verbs** - Explicit lifecycle events:
 *   - created, deleted, assigned, unassigned, issued, requested, completed, failed
 *
 * Examples:
 *   ✓ user.status_changed        (lifecycle transition)
 *   ✓ user.profile_updated        (data modification)
 *   ✓ user.created                (lifecycle event)
 *   ✓ organization.name_changed   (identity change)
 *   ✓ organization.updated        (general property updates)
 */

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
import { OrganizationCreatedDto } from './organizations/organization-created.dto';
import { OrganizationUpdatedDto } from './organizations/organization-updated.dto';
import { OrganizationNameChangedDto } from './organizations/organization-name-changed.dto';
import { OrganizationStatusUpdatedDto } from './organizations/organization-status-updated.dto';
import { OrganizationSettingsUpdatedDto } from './organizations/organization-settings-updated.dto';
import { DebtorProfileCreatedDto } from './debtors';
import { AnalyticsDashboardSummaryRequestedDto } from './analytics/analytics-dashboard-summary-requested.dto';

export const EVENT_DTO_MAP = {
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED]: OrganizationCreatedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED]: OrganizationUpdatedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED]: OrganizationNameChangedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED]: OrganizationStatusUpdatedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED]: OrganizationSettingsUpdatedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_CREATED]: DebtorProfileCreatedDto,
  [EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED]: AnalyticsDashboardSummaryRequestedDto,
} as const;
