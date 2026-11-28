import { BankruptcyStatusUpdatedPayload } from '@verichron/events';
import { BankruptcyStatus } from '@verichron/enums';
import { IsUUID, IsEnum, IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class BankruptcyStatusUpdatedDto implements BankruptcyStatusUpdatedPayload {
  @IsUUID()
  bankruptcyFilingId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsOptional()
  @IsUUID()
  debtId: string | null;

  @IsUUID()
  organizationId: string;

  @IsString()
  caseNumber: string;

  @IsEnum(BankruptcyStatus)
  oldStatus: BankruptcyStatus;

  @IsEnum(BankruptcyStatus)
  newStatus: BankruptcyStatus;

  @IsDateString()
  statusDate: string;

  @IsBoolean()
  debtDischarged: boolean;

  @IsDateString()
  updatedAt: string;
}
