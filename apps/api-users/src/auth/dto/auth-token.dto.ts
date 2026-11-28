import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, ValidateIf } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { IAuthToken } from '@verichron/contracts';

export class AuthTokenDto implements IAuthToken {
  @ApiProperty({
    description: 'The ID of the organization to get a scoped token for. Omit for platform-level token.',
    type: 'string',
    format: 'uuid',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  @IsUUID()
  @Expose()
  @Transform(({ value }) => (value === null ? undefined : value))
  organizationId?: string | null;

  @ApiPropertyOptional({
    description: 'The previous organization ID when switching contexts (for audit/event tracking).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  @Expose()
  fromOrganizationId?: string;

  constructor(partial?: Partial<AuthTokenDto>) {
    Object.assign(this, partial);
    // Ensure organizationId is undefined if it's null
    if (this.organizationId === null) {
      this.organizationId = undefined;
    }
  }
}