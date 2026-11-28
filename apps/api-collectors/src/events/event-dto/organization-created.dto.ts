import { IsUUID, IsString, IsNotEmpty, IsEnum, IsOptional, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationCreatedPayload } from '@verichron/events';
import { OrganizationType } from '@verichron/enums';

class AdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class OrganizationCreatedDto implements OrganizationCreatedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser: AdminUserDto;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  createdAt?: string;
}