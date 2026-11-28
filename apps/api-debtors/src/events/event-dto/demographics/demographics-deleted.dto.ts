import { IsDateString, IsUUID } from 'class-validator';
import { DemographicsDeletedPayload } from '@verichron/events';

export class DemographicsDeletedDto implements DemographicsDeletedPayload {
  @IsUUID()
  demographicsId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  deletedAt: string;
}
