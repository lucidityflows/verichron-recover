import { DebtStatusQueryResponsePayload } from '@verichron/events';
import { IsString, IsOptional } from 'class-validator';

export class DebtStatusQueryResponseDto implements DebtStatusQueryResponsePayload {
  @IsString()
  organizationId: string;

  @IsString()
  debtId: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  currentBalance?: string;

  @IsOptional()
  @IsString()
  lastPaymentDate?: string | null;

  @IsOptional()
  @IsString()
  error?: string;
}
