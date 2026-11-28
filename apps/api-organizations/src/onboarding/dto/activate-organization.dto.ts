import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { IActivateOrganization } from '@verichron/contracts';

/**
 * DTO for internal activate-organization endpoint
 * Used by orchestrator to activate organization after provisioning admin user
 */
export class ActivateOrganizationDto implements IActivateOrganization {
  @ApiProperty({
    description: 'Organization ID to activate',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'User ID who is activating the organization',
    format: 'uuid',
  })
  @IsUUID()
  updatedBy: string;

  @ApiProperty({
    description: 'Actor Email',
    example: 'admin@acme.com',
  })
  @IsEmail()
  actorEmail: string;

  @ApiProperty({
    description: 'Actor Name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  actorName: string;

  @ApiProperty({
    description: 'Reason for activation',
    example: 'Initial admin user provisioned.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}