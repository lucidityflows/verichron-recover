import { ActionType } from '@verichron/enums';

export interface DebtorActionLoggedPayload {
  actionId: string;
  organizationId: string;
  debtorId: string;
  collectorUserId: string;
  actionType: ActionType;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
