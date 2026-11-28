import { BankruptcyFiledPayload } from '@verichron/events';
import { BankruptcyChapter } from '@verichron/enums';
import { IsUUID, IsEnum, IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class BankruptcyFiledDto implements BankruptcyFiledPayload {
  @IsUUID()
  bankruptcyFilingId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsOptional()
  @IsUUID()
  debtId: string | null;

  @IsUUID()
  organizationId: string;

  @IsEnum(BankruptcyChapter)
  chapter: BankruptcyChapter;

  @IsString()
  caseNumber: string;

  @IsString()
  courtDistrict: string;

  @IsDateString()
  filingDate: string;

  @IsBoolean()
  debtIncludedInSchedules: boolean;

  @IsDateString()
  filedAt: string;
}
