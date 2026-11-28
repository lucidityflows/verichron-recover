import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './organization-create.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrganizationStatus } from '@verichron/enums';

/**
 * DTO for updating an existing organization
 * All fields from create are optional, plus status can be updated
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto)  {
  @ApiProperty({
    description: 'Organization status',
    enum: OrganizationStatus,
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
