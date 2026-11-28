
import { OrganizationNameChangedPayload } from '@verichron/events';
import { IsDateString, IsString, IsUUID } from 'class-validator';

export class OrganizationNameChangedDto implements OrganizationNameChangedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  previousName: string;

  @IsString()
  newName: string;

  @IsDateString()
  changedAt: string;

  @IsUUID()
  updatedBy: string;
}
