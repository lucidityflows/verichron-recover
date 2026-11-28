import { REALTIME_EVENT_TYPES } from '@verichron/events';
import * as DTOs from './realtime-events.dto';

/**
 * Mapping of Realtime Event Types to their corresponding DTO classes.
 * This follows the design pattern used in our local events modules.
 */
export const REALTIME_DTO_MAP = {
  [REALTIME_EVENT_TYPES.USER_STATUS_CHANGED]: DTOs.WSUserStatusChangedDto,
  [REALTIME_EVENT_TYPES.TEAM_MEMBER_ADDED]: DTOs.WSTeamMemberAddedDto,
  [REALTIME_EVENT_TYPES.DEBT_STATUS_CHANGED]: DTOs.WSDebtStatusChangedDto,
  [REALTIME_EVENT_TYPES.PAYMENT_RECEIVED]: DTOs.WSPaymentReceivedDto,
  [REALTIME_EVENT_TYPES.WORK_ITEM_ASSIGNED]: DTOs.WSWorkItemAssignedDto,
  [REALTIME_EVENT_TYPES.COMPLIANCE_BLOCKED]: DTOs.WSComplianceBlockedDto,
  [REALTIME_EVENT_TYPES.SETTLEMENT_REQUESTED]: DTOs.WSSettlementRequestedDto,
  [REALTIME_EVENT_TYPES.GOAL_PROGRESS_UPDATED]: DTOs.WSGoalProgressUpdatedDto,
} as const;
