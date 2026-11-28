import { AnalyticsDebtorFocusCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtorFocusViewResponseDto } from '../../../dashboards/collectors/dto/debtor-focus-view-response.dto';

export class AnalyticsDebtorFocusCompletedDto implements AnalyticsDebtorFocusCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DebtorFocusViewResponseDto)
  debtorFocusView?: DebtorFocusViewResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
