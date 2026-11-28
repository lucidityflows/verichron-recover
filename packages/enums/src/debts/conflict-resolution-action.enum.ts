/**
 * Conflict Resolution Action Enumeration
 *
 * Defines the possible user actions when resolving a creditor entity conflict.
 *
 * **Resolution Workflow:**
 * 1. User reviews AI suggestions in the CreditorResolver UI
 * 2. User selects one of three actions:
 *    - MERGE: Accept AI suggestion, link to master creditor
 *    - CREATE_NEW: Reject all suggestions, create new master
 *    - DISMISS: Defer decision, leave conflict in queue
 *
 * **Audit Trail:**
 * All actions are logged with user ID, timestamp, and optional notes.
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
export enum ConflictResolutionAction {
  /**
   * User approved merge with suggested master creditor.
   * Updates temp creditor to link to master (org-owned or global).
   * Reassigns all debts to master creditor.
   * Creates audit log entry.
   */
  MERGE = 'MERGE',

  /**
   * User rejected all AI suggestions.
   * Converts temp creditor to permanent master creditor.
   * Keeps all debt associations intact.
   * Conflict marked as RESOLVED.
   */
  CREATE_NEW = 'CREATE_NEW',

  /**
   * User deferred decision without action.
   * Conflict remains in queue with DISMISSED status.
   * Can be reopened from dismissed queue later.
   * Used for borderline cases requiring more research.
   */
  DISMISS = 'DISMISS',
}
