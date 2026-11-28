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
 *   - filed, accepted, rejected, completed, defaulted
 *
 * Examples:
 *   ✓ settlement_offer.created       (new offer)
 *   ✓ settlement_offer.accepted      (explicit action)
 *   ✓ bankruptcy.filed               (legal filing)
 *   ✓ bankruptcy.status_updated      (status transition)
 */

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
import { SettlementOfferCreatedDto } from './settlement-offers/settlement-offer-created.dto';
import { SettlementOfferAcceptedDto } from './settlement-offers/settlement-offer-accepted.dto';
import { SettlementOfferRejectedDto } from './settlement-offers/settlement-offer-rejected.dto';
import { SettlementOfferCompletedDto } from './settlement-offers/settlement-offer-completed.dto';
import { SettlementOfferDefaultedDto } from './settlement-offers/settlement-offer-defaulted.dto';
import { BankruptcyFiledDto } from './bankruptcies/bankruptcy-filed.dto';
import { BankruptcyStatusUpdatedDto } from './bankruptcies/bankruptcy-status-updated.dto';
import { TransactionSucceededDto } from './transactions/transaction-succeeded.dto';
import { TransactionFailedDto } from './transactions/transaction-failed.dto';
import { RefundIssuedDto } from './transactions/refund-issued.dto';
import { PaymentPlanStatusChangedDto } from './payment-plans/payment-plan-status-changed.dto';

export const EVENT_DTO_MAP = {
  [EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED]: TransactionSucceededDto,
  [EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED]: TransactionFailedDto,
  [EVENT_TYPES.TRANSACTIONS_REFUND_ISSUED]: RefundIssuedDto,
  [EVENT_TYPES.TRANSACTIONS_PAYMENT_PLAN_STATUS_CHANGED]: PaymentPlanStatusChangedDto,
  [EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_CREATED]: SettlementOfferCreatedDto,
  [EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_ACCEPTED]: SettlementOfferAcceptedDto,
  [EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_REJECTED]: SettlementOfferRejectedDto,
  [EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_COMPLETED]: SettlementOfferCompletedDto,
  [EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_DEFAULTED]: SettlementOfferDefaultedDto,
  [EVENT_TYPES.TRANSACTIONS_BANKRUPTCY_FILED]: BankruptcyFiledDto,
  [EVENT_TYPES.TRANSACTIONS_BANKRUPTCY_STATUS_UPDATED]: BankruptcyStatusUpdatedDto,
} as const;
