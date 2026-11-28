import { IsEnum, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationType } from '@verichron/enums';

export class CheckComplianceDto {
  @ApiProperty({
    description: 'Debtor ID to check compliance for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  debtorId: string;

  @ApiProperty({
    description: 'The type of communication being checked',
    enum: CommunicationType,
    enumName: 'CommunicationType',
    example: CommunicationType.CALL,
  })
  @IsEnum(CommunicationType)
  communicationType: CommunicationType;

  @ApiPropertyOptional({
    description: 'Simulated time for the check (defaults to now)',
    example: '2025-12-27T21:15:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ComplianceCheckResponseDto {
  @ApiProperty({ example: false })
  allowed: boolean;

  @ApiPropertyOptional({
    description: 'Human-readable reason if blocked',
    example: 'It is 09:15 PM in Chicago (CST). Allowed: 08:00-21:00.',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'The internal rule name that triggered the block',
    example: 'TIME_OF_DAY',
  })
  ruleName?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the next contact might be allowed',
    format: 'date-time',
  })
  nextAllowedAt?: Date;
}
