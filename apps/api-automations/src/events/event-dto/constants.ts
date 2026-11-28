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

import { AutoAssignmentCompletedDto } from "./automations/auto-assignment-completed.dto";
import { AutoAssignmentFailedDto } from "./automations/auto-assignment-failed.dto";
import { EscalationCompletedDto } from "./automations/escalation-completed.dto";
import { EscalationFailedDto } from "./automations/escalation-failed.dto";
import { ExecuteAutoAssignmentDto } from "./automations/execute-auto-assignment.dto";
import { ExecuteEscalationDto } from "./automations/execute-escalation.dto";
import { ExecuteScheduledAutoAssignmentDto } from "./automations/execute-scheduled-auto-assignment.dto";


export const EVENT_DTO_MAP = {
  [EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED]: AutoAssignmentCompletedDto,
  [EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED]: AutoAssignmentFailedDto,
  [EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED]: EscalationCompletedDto,
  [EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED]: EscalationFailedDto,
  [EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT]: ExecuteAutoAssignmentDto,
  [EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION]: ExecuteEscalationDto,
  [EVENT_TYPES.AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT]: ExecuteScheduledAutoAssignmentDto

} as const;
