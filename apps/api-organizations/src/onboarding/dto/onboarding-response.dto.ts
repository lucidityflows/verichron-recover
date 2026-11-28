import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IOnboardingResponse } from '@verichron/contracts';

/**
 * Response DTO after successful organization provisioning
 */
@Exclude()
export class OnboardingResponseDto implements IOnboardingResponse {
  @Expose()
  @ApiProperty({
    description: 'Created organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Collection Agency',
  })
  orgName!: string;

  @Expose()
  @ApiProperty({
    description: 'Created admin user ID (from api-users)',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  adminUserId!: string;

  @Expose()
  @ApiProperty({
    description: 'Admin user email',
    example: 'admin@acme-collections.com',
  })
  adminEmail!: string;

  @Expose()
  @ApiProperty({
    description: 'Onboarding completion message',
    example: 'Organization successfully provisioned and activated',
  })
  message!: string;

  @Expose()
  @ApiProperty({
    description: 'When the organization was created',
    example: '2025-10-18T10:00:00.000Z',
  })
  createdAt!: Date;
}
