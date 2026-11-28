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
import { DebtorUserLinkedDto, ImportBatchCompletedDto, DebtorInformationReceivedDto } from './debtors';
import { DebtCreatedDto } from './debts/debt-created.dto';
import { DebtUpdatedDto } from './debts/debt-updated.dto';
import { DebtStatusChangedDto } from './debts/debt-status-changed.dto';
import { CreditorCreatedDto } from './creditors/creditor-created.dto';
import { CreditorUpdatedDto } from './creditors/creditor-updated.dto';
import { ChargeOffRecordedDto } from './charge-offs/charge-off-recorded.dto';
import { ChargeOffReversedDto } from './charge-offs/charge-off-reversed.dto';
import { PortfolioCreatedDto } from './portfolios/portfolio-created.dto';
import { PortfolioUpdatedDto } from './portfolios/portfolio-updated.dto';
import { PortfolioStatusChangedDto } from './portfolios/portfolio-status-changed.dto';
import { PortfolioSoldDto } from './portfolios/portfolio-sold.dto';
import { PortfolioUserAccessGrantedDto } from './portfolios/portfolio-user-access-granted.dto';
import { PortfolioUserAccessRevokedDto } from './portfolios/portfolio-user-access-revoked.dto';
import { PortfolioImportCompletedDto } from './portfolios/portfolio-import-completed.dto';
import { PortfolioDebtorBatchReadyDto } from './portfolios/portfolio-debtor-batch-ready.dto';
import { DebtStatusQueryRequestedDto } from './debts/debt-status-query-requested.dto';
import { DebtStatusQueryResponseDto } from './debts/debt-status-query-response.dto';

export const EVENT_DTO_MAP = {
  [EVENT_TYPES.DEBTORS_USER_LINKED]: DebtorUserLinkedDto,
  [EVENT_TYPES.DEBTORS_IMPORT_BATCH_COMPLETED]: ImportBatchCompletedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_INFORMATION_RECEIVED]: DebtorInformationReceivedDto,
  [EVENT_TYPES.DEBTS_DEBT_CREATED]: DebtCreatedDto,
  [EVENT_TYPES.DEBTS_DEBT_UPDATED]: DebtUpdatedDto,
  [EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED]: DebtStatusChangedDto,
  [EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED]: DebtStatusQueryRequestedDto,
  [EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE]: DebtStatusQueryResponseDto,
  [EVENT_TYPES.DEBTS_CREDITOR_CREATED]: CreditorCreatedDto,
  [EVENT_TYPES.DEBTS_CREDITOR_UPDATED]: CreditorUpdatedDto,
  [EVENT_TYPES.DEBTS_CHARGE_OFF_RECORDED]: ChargeOffRecordedDto,
  [EVENT_TYPES.DEBTS_CHARGE_OFF_REVERSED]: ChargeOffReversedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_CREATED]: PortfolioCreatedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_UPDATED]: PortfolioUpdatedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_STATUS_CHANGED]: PortfolioStatusChangedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_SOLD]: PortfolioSoldDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_GRANTED]: PortfolioUserAccessGrantedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_REVOKED]: PortfolioUserAccessRevokedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_IMPORT_COMPLETED]: PortfolioImportCompletedDto,
  [EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY]: PortfolioDebtorBatchReadyDto,
} as const;
