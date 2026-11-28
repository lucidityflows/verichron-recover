import { CreditorUpdatedPayload } from '@verichron/events';
import { IsUUID, IsNumber, IsDateString } from 'class-validator';

export class CreditorUpdatedDto implements CreditorUpdatedPayload {
  @IsUUID()
  creditorId: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  debtCount: number;

  @IsNumber()
  totalPrincipal: number;

  @IsDateString()
  updatedAt: string;
}
