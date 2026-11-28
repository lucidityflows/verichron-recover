import { DebtStatusQueryRequestedPayload } from '@verichron/events';
import { IsString, IsOptional } from 'class-validator';

export class DebtStatusQueryRequestedDto implements DebtStatusQueryRequestedPayload {
  @IsString()
  organizationId: string;

  @IsString()
  debtId: string;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
