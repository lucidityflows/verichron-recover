import { ActionType, CallOutcome, PaymentMethod } from '@verichron/enums';

/**
 * Request to log an action on a debtor
 */
export interface ILogDebtorAction {
  actionType: ActionType;
  content: string;
  outcome?: CallOutcome;
  scheduledFollowUp?: IScheduledFollowUp;
  paymentDetails?: IPaymentDetails;
  debtIds?: string[];
  metadata?: Record<string, any>;
}

/**
 * Scheduled follow-up details
 */
export interface IScheduledFollowUp {
  dueDate: Date;
  actionType: ActionType;
  notes?: string;
}

/**
 * Payment details when logging a payment
 */
export interface IPaymentDetails {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  confirmationNumber?: string;
  debtId: string;
}

/**
 * Response after logging a debtor action
 */
export interface IDebtorActionResponse {
  actionId: string;
  success: boolean;
  message?: string;
  timelineEventId?: string;
}
