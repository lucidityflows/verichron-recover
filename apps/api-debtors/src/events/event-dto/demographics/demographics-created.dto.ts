import { IsDateString, IsUUID } from 'class-validator';
import { DemographicsCreatedPayload } from '@verichron/events';

export class DemographicsCreatedDto implements DemographicsCreatedPayload {
  @IsUUID()
  demographicsId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  createdAt: string;
}
