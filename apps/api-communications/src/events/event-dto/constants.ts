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
 *   - General field updates: communication_updated, preferences_updated (catch-all)
 *   - Configuration changes: template_updated, gateway_config_updated
 *
 * **Specific action verbs** - Explicit lifecycle events:
 *   - created, deleted, dispatched, delivered, failed, opened, clicked, blocked, reported (spam)
 *
 * Examples:
 *   ✓ communication.dispatched      (explicit lifecycle action)
 *   ✓ communication.failed          (explicit lifecycle action)
 *   ✓ communication.status_changed  (lifecycle transition - though usually captured by specific actions)
 *   ✓ template.created              (explicit lifecycle action)
 *   ✓ template.updated              (data modification, leads to new version)
 *   ✓ preference.opt_out_recorded   (explicit action)
 */

// Import all event DTOs
import { CommunicationBlockedDto } from './communications/communication-blocked.dto';
import { CommunicationClickedDto } from './communications/communication-clicked.dto';
import { CommunicationDeliveredDto } from './communications/communication-delivered.dto';
import { CommunicationDispatchedDto } from './communications/communication-dispatched.dto';
import { CommunicationFailedDto } from './communications/communication-failed.dto';
import { CommunicationSpamReportedDto } from './communications/communication-spam-reported.dto';
import { EmailOpenedDto } from './communications/email-opened.dto';
import { EmailReplyReceivedDto } from './communications/email-reply-received.dto';
import { SmsReplyReceivedDto } from './communications/sms-reply-received.dto';
import { CallbackRequestedDto } from './communications/callback-requested.dto';

import { CollectorDebtorContactAttemptedDto } from './collectors/collector-debtor-contact-attempted.dto';

import { TransactionSucceededDto } from './transactions/transaction-succeeded.dto';
import { TransactionFailedDto } from './transactions/transaction-failed.dto';
import { TransactionRefundIssuedDto } from './transactions/transaction-refund-issued.dto';

import { DebtCreatedDto } from './debts/debt-created.dto';
import { DebtStatusChangedDto } from './debts/debt-status-changed.dto';

import { DebtorInvitationRequestedDto } from './debtors/debtor-invitation-requested.dto';
import { DebtorInvitationBatchRequestedDto } from './debtors/debtor-invitation-batch-requested.dto';
import { DebtorVerificationStatusChangedDto } from './debtors/debtor-verification-status-changed.dto';

import { PasswordResetRequestedDto } from './users/password-reset-requested.dto';
import { DebtorUserCreatedDto } from './users/debtor-user-created.dto';
import { DebtorInvitationDispatchedDto } from './communications/debtor-invitation-dispatched.dto';

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
export const EVENT_DTO_MAP = {
  // Published Communication Events
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_BLOCKED]: CommunicationBlockedDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_CLICKED]: CommunicationClickedDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_DELIVERED]: CommunicationDeliveredDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_DISPATCHED]: CommunicationDispatchedDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_FAILED]: CommunicationFailedDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_SPAM_REPORTED]: CommunicationSpamReportedDto,
  [EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_OPENED]: EmailOpenedDto,
  [EVENT_TYPES.COMMUNICATIONS_EMAIL_REPLY_RECEIVED]: EmailReplyReceivedDto,
  [EVENT_TYPES.COMMUNICATIONS_SMS_REPLY_RECEIVED]: SmsReplyReceivedDto,
  [EVENT_TYPES.COMMUNICATIONS_CALLBACK_REQUESTED]: CallbackRequestedDto,

  // Subscribed Events
  [EVENT_TYPES.COLLECTORS_DEBTOR_CONTACT_ATTEMPTED]: CollectorDebtorContactAttemptedDto,

  [EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED]: TransactionSucceededDto,
  [EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED]: TransactionFailedDto,
  [EVENT_TYPES.TRANSACTIONS_REFUND_ISSUED]: TransactionRefundIssuedDto,

  [EVENT_TYPES.DEBTS_DEBT_CREATED]: DebtCreatedDto,
  [EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED]: DebtStatusChangedDto,

  [EVENT_TYPES.COMMUNICATIONS_DEBTOR_INVITATION_DISPATCHED]: DebtorInvitationDispatchedDto,
  [EVENT_TYPES.DEBTORS_INVITATION_REQUESTED]: DebtorInvitationRequestedDto,
  [EVENT_TYPES.DEBTORS_INVITATION_BATCH_REQUESTED]: DebtorInvitationBatchRequestedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED]: DebtorVerificationStatusChangedDto,


  [EVENT_TYPES.USERS_AUTH_PASSWORD_RESET_REQUESTED]: PasswordResetRequestedDto,
  [EVENT_TYPES.USERS_DEBTOR_USER_CREATED]: DebtorUserCreatedDto,
} as const;
