import { IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtorInformationReceivedPayload } from '@verichron/events';

class DebtorAddressData {
  @IsString()
  streetLine1: string;

  @IsOptional()
  @IsString()
  streetLine2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsOptional()
  @IsString()
  country?: string;
}

class DebtorData {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DebtorAddressData)
  address?: DebtorAddressData;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Event DTO for DebtorInformationReceived event
 *
 * Published by api-debts during import, consumed by api-debtors
 */
export class DebtorInformationReceivedDto implements DebtorInformationReceivedPayload {
  @IsUUID()
  sourceOrganizationId: string;

  @IsOptional()
  @IsString()
  importJobId?: string;

  @IsOptional()
  @IsString()
  debtId?: string;

  @ValidateNested()
  @Type(() => DebtorData)
  debtorData: DebtorData;
}
