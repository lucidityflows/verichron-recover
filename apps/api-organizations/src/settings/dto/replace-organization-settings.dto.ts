import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationSettingsDto } from './full-settings.dto';
import { IReplaceOrganizationSettings } from '@verichron/contracts';

/**
 * DTO for full replacement of organization settings (PUT)
 * Will completely replace existing settings
 */
export class ReplaceOrganizationSettingsDto implements IReplaceOrganizationSettings {
  @ApiProperty({
    description: 'Complete settings object (will replace all existing settings)',
    type: OrganizationSettingsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings!: OrganizationSettingsDto;
}
