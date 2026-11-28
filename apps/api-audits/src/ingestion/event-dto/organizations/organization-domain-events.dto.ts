import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import type {
  OrganizationCreatedPayload,
  OrganizationUpdatedPayload,
  OrganizationNameChangedPayload,
  OrganizationSettingsUpdatedPayload,
  TeamCreatedPayload,
  TeamUpdatedPayload,
  TeamDeletedPayload,
  TeamMemberAddedPayload,
  TeamMemberRemovedPayload,
  PortfolioAssignedToTeamPayload,
  PortfolioUnassignedFromTeamPayload,
} from '@verichron/events';
import { OrganizationType, TeamMemberRole } from '@verichron/enums';

class AdminUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;
}

export class OrganizationCreatedDto implements OrganizationCreatedPayload {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;

  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser!: AdminUserDto;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsDateString()
  @IsOptional()
  createdAt?: string;
}

export class OrganizationUpdatedDto implements OrganizationUpdatedPayload {
  @IsUUID()
  organizationId!: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields!: string[];

  @IsDateString()
  updatedAt!: string;

  @IsUUID()
  updatedBy!: string;
}

export class OrganizationNameChangedDto implements OrganizationNameChangedPayload {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  previousName!: string;

  @IsString()
  @IsNotEmpty()
  newName!: string;

  @IsDateString()
  changedAt!: string;

  @IsUUID()
  updatedBy!: string;
}

export class OrganizationSettingsUpdatedDto implements OrganizationSettingsUpdatedPayload {
  @IsUUID()
  organizationId!: string;

  @IsArray()
  @IsString({ each: true })
  updatedSettingKeys!: string[];

  @IsUUID()
  updatedBy!: string;
}

export class TeamCreatedDto implements TeamCreatedPayload {
  @IsUUID()
  teamId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsOptional()
  managerUserId?: string;

  @IsDateString()
  createdAt!: string;
}

export class TeamUpdatedDto implements TeamUpdatedPayload {
  @IsUUID()
  teamId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsOptional()
  managerUserId?: string;

  @IsDateString()
  updatedAt!: string;
}

export class TeamDeletedDto implements TeamDeletedPayload {
  @IsUUID()
  teamId!: string;

  @IsUUID()
  organizationId!: string;

  @IsDateString()
  deletedAt!: string;
}

export class TeamMemberAddedDto implements TeamMemberAddedPayload {
  @IsUUID()
  teamId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsEnum(TeamMemberRole)
  roleOnTeam!: TeamMemberRole;

  @IsBoolean()
  isPrimary!: boolean;

  @IsDateString()
  addedAt!: string;
}

export class TeamMemberRemovedDto implements TeamMemberRemovedPayload {
  @IsUUID()
  teamId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsDateString()
  removedAt!: string;
}

export class PortfolioAssignedToTeamDto implements PortfolioAssignedToTeamPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  portfolioId!: string;

  @IsUUID()
  teamId!: string;

  @IsDateString()
  assignedAt!: string;
}

export class PortfolioUnassignedFromTeamDto implements PortfolioUnassignedFromTeamPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  portfolioId!: string;

  @IsUUID()
  teamId!: string;

  @IsDateString()
  unassignedAt!: string;
}
