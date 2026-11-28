import { EVENT_TYPES } from '@verichron/events';

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
 *   - General field updates: debt_updated, portfolio_updated (catch-all)
 *   - Configuration changes: preferences_updated, configuration_updated
 *
 * **Specific action verbs** - Explicit lifecycle events:
 *   - created, deleted, assigned, unassigned, sold, granted, revoked
 *
 * Examples:
 *   ✓ debt.status_changed        (lifecycle transition)
 *   ✓ debt.updated                (data modification)
 *   ✓ portfolio.sold              (explicit action)
 *   ✓ portfolio.user_access_granted (specific permission action)
 */

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
import { CreateTaskDto } from './create-task.dto';
import { UpdatePriorityDto } from './update-priority.dto';
import { GoalCreatedDto } from './goal-created.dto';
import { GoalUpdatedDto } from './goal-updated.dto';
import { GoalDeletedDto } from './goal-deleted.dto';
import { GoalProgressUpdatedDto } from './goal-progress-updated.dto';
import { TransactionSucceededDto } from './transaction-succeeded.dto';
import { DebtorActionLoggedDto } from './debtor-action-logged.dto';
import { CallbackRequestedDto } from './callback-requested.dto';
import { DebtorContactAttemptedDto } from './debtor-contact-attempted.dto';
import { EmailReplyReceivedDto } from './email-reply-received.dto';
import { PaymentPlanCreatedDto } from './payment-plan-created.dto';
import { PaymentReceivedDto } from './payment-received.dto';
import { SmsReplyReceivedDto } from './sms-reply-received.dto';
import { VerificationRequestedDto } from './verification-requested.dto';
import { WorkQueueItemCompletedDto } from './work-queue-item-completed.dto';
import { DebtCreatedDto } from './debt-created.dto';
import { WorkQueueItemAssignedDto } from './work-queue-item-assigned.dto';


export const EVENT_DTO_MAP = {
  [EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK]: CreateTaskDto,
  [EVENT_TYPES.DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY]: UpdatePriorityDto,
  [EVENT_TYPES.COLLECTORS_GOAL_CREATED]: GoalCreatedDto,
  [EVENT_TYPES.COLLECTORS_GOAL_UPDATED]: GoalUpdatedDto,
  [EVENT_TYPES.COLLECTORS_GOAL_DELETED]: GoalDeletedDto,
  [EVENT_TYPES.COLLECTORS_GOAL_PROGRESS_UPDATED]: GoalProgressUpdatedDto,
  [EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED]: TransactionSucceededDto,
  [EVENT_TYPES.COLLECTORS_DEBTOR_ACTION_LOGGED]: DebtorActionLoggedDto,
  [EVENT_TYPES.COMMUNICATIONS_CALLBACK_REQUESTED]: CallbackRequestedDto,
  [EVENT_TYPES.COLLECTORS_DEBTOR_CONTACT_ATTEMPTED]: DebtorContactAttemptedDto,
  [EVENT_TYPES.COMMUNICATIONS_EMAIL_REPLY_RECEIVED]: EmailReplyReceivedDto,
  [EVENT_TYPES.TRANSACTIONS_PAYMENT_PLAN_CREATED]: PaymentPlanCreatedDto,
  [EVENT_TYPES.TRANSACTIONS_PAYMENT_RECEIVED]: PaymentReceivedDto,
  [EVENT_TYPES.COMMUNICATIONS_SMS_REPLY_RECEIVED]: SmsReplyReceivedDto,
  [EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED]: VerificationRequestedDto,
  [EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_COMPLETED]: WorkQueueItemCompletedDto,
  [EVENT_TYPES.DEBTS_DEBT_CREATED]: DebtCreatedDto,
  [EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED]: WorkQueueItemAssignedDto,
} as const;
