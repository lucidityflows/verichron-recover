import { IsArray, IsDateString, IsString, IsUUID } from 'class-validator';
import { DemographicsUpdatedPayload } from '@verichron/events';

export class DemographicsUpdatedDto implements DemographicsUpdatedPayload {
  @IsUUID()
  demographicsId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];
}
