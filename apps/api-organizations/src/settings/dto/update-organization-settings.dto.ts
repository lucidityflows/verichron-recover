import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationSettingsDto } from './full-settings.dto';
import { IUpdateOrganizationSettings } from '@verichron/contracts';

/**
 * DTO for partial update of organization settings (PATCH)
 * Will be merged with existing settings
 */
export class UpdateOrganizationSettingsDto implements IUpdateOrganizationSettings {
  @ApiProperty({
    description: 'Partial settings to update (will be merged with existing settings)',
    type: OrganizationSettingsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings!: OrganizationSettingsDto;
}