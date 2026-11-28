
import { OrganizationUpdatedPayload } from '@verichron/events';
import { IsArray, IsDateString, IsString, IsUUID } from 'class-validator';

export class OrganizationUpdatedDto implements OrganizationUpdatedPayload {
  @IsUUID()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];

  @IsDateString()
  updatedAt: string;

  @IsUUID()
  updatedBy: string;
}
