import { DebtorUserLinkedPayload } from '@verichron/events';
import { IsUUID, IsDateString } from 'class-validator';

export class DebtorUserLinkedDto implements DebtorUserLinkedPayload {
  @IsUUID()
  debtorIdentityId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  linkedAt: string;
}
