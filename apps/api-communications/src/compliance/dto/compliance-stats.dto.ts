import { ApiProperty } from '@nestjs/swagger';

export class ComplianceStatsDto {
  @ApiProperty({
    description: 'Total number of violations prevented in the period',
    example: 247,
  })
  totalPrevented: number;

  @ApiProperty({
    description: 'Breakdown of prevented violations by rule name',
    example: {
      TIME_OF_DAY: 89,
      FREQUENCY_LIMIT: 67,
      OPT_OUT: 28
    },
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  byType: Record<string, number>;
}

export class ComplianceActivityDto {
  @ApiProperty({ example: '658c1234567890abcdef1234' })
  _id: string;

  @ApiProperty({ example: 'api-organizations-id' })
  organizationId: string;

  @ApiProperty({ example: 'debtor-uuid' })
  debtorId: string;

  @ApiProperty({ 
    description: 'The type of communication blocked',
    example: 'CALL' 
  })
  type: string;

  @ApiProperty({ 
    description: 'The reason why the communication was blocked',
    example: 'Outside 8am-9pm debtor local time' 
  })
  blockedReason: string;

  @ApiProperty({ example: '2025-12-27T21:15:00Z' })
  createdAt: string;
}
