import { OrganizationType } from '@verichron/enums';
import { OrganizationCreatedPayload } from '@verichron/events';
import { IsString, IsEmail, IsUUID, IsOptional, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class AdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}

export class OrganizationCreatedDto implements OrganizationCreatedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser: AdminUserDto;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsDateString()
  @IsOptional()
  createdAt?: string;
}