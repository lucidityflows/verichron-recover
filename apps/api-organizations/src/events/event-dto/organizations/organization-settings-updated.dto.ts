
import { OrganizationSettingsUpdatedPayload } from '@verichron/events';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class OrganizationSettingsUpdatedDto implements OrganizationSettingsUpdatedPayload {
  @IsUUID()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  updatedSettingKeys: string[];

  @IsUUID()
  updatedBy: string;
}
