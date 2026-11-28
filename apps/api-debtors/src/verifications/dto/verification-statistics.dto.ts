import { ApiProperty } from '@nestjs/swagger';

export class VerificationStatisticsDto {
  @ApiProperty({
    type: Number,
    description: 'Total number of verification requests',
    example: 25,
  })
  total: number;

  @ApiProperty({
    type: Object, // Using Object here as the keys are dynamic based on status
    description: 'Counts of verification requests by status',
    example: { VERIFIED: 15, FAILED: 5, PENDING: 5 },
    additionalProperties: { type: 'number' },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    type: Object, // Using Object here as the keys are dynamic based on type
    description: 'Counts of verification requests by type',
    example: { ADDRESS_VERIFICATION: 10, PHONE_VERIFICATION: 8, EMAIL_VERIFICATION: 7 },
    additionalProperties: { type: 'number' },
  })
  byType: Record<string, number>;
}
