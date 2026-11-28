import { DebtorProfileCreatedPayload } from '@verichron/events';
import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';

export class DebtorProfileCreatedDto implements DebtorProfileCreatedPayload {
  @IsUUID()
  @IsNotEmpty()
  profileId: string;

  @IsUUID()
  @IsNotEmpty()
  identityId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsDateString()
  @IsNotEmpty()
  createdAt: string;
}
