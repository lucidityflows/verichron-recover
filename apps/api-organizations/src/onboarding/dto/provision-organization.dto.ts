import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  ValidateNested,
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrganizationDto } from '../../profiles/dto/organization-create.dto';
import { IInitialAdminUser, IProvisionOrganization } from '@verichron/contracts';

/**
 * DTO for initial admin user provisioning (sent to api-users)
 */
export class InitialAdminUserDto implements IInitialAdminUser {
  @ApiProperty({
    description: 'Admin user email',
    example: 'admin@acme-collections.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Admin user first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Admin user last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'Admin user password (will be hashed by api-users)',
    example: 'SecureP@ssw0rd!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/**
 * DTO for provisioning a new organization with initial admin user
 * Used by platform admins to onboard new tenants
 */
export class ProvisionOrganizationDto implements IProvisionOrganization {
  @ApiProperty({
    description: 'Organization data',
    type: CreateOrganizationDto,
  })
  @ValidateNested()
  @Type(() => CreateOrganizationDto)
  @IsNotEmpty()
  organization!: CreateOrganizationDto;

  @ApiProperty({
    description: 'Initial admin user data (will be sent to api-users)',
    type: InitialAdminUserDto,
  })
  @ValidateNested()
  @Type(() => InitialAdminUserDto)
  @IsNotEmpty()
  initialAdmin!: InitialAdminUserDto;

  @ApiProperty({
    description: 'Optional default settings template to apply',
    example: {
      branding: {
        logo_url: 'https://cdn.example.com/default-logo.png',
        primary_color_hex: '#1E40AF',
      },
      compliance: {
        fdcpa_strict_mode: true,
        record_all_calls: true,
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  defaultSettings?: Record<string, any>;

  /**
   * ID of the platform admin who initiated onboarding.
   * This is set by the controller from the JWT token, not by the client.
   * @internal
   */
  @Allow()
  createdBy?: string;
}
