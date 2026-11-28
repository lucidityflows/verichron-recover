import { IsUUID, IsNumber, IsString, IsDateString } from 'class-validator';
import { PaymentPlanStatusChangedPayload } from '@verichron/events';

/**
 * Event DTO for PaymentPlanStatusChanged event
 *
 * Published by api-transactions when a payment plan status changes
 * Consumed by api-communications for debtor notifications and analytics services
 */
export class PaymentPlanStatusChangedDto implements PaymentPlanStatusChangedPayload {
  @IsUUID()
  planId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorId: string;

  @IsString()
  oldStatus: string;

  @IsString()
  newStatus: string;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  numberOfInstallments: number;

  @IsDateString()
  statusChangedAt: string;
}
