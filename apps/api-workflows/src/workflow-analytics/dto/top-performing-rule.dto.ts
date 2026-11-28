import { ApiProperty } from '@nestjs/swagger';

export class TopPerformingRuleDto {
  @ApiProperty({
    description: 'ID of the top-performing rule',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  ruleId: string;

  @ApiProperty({
    description: 'Name of the top-performing rule',
    example: 'High Balance Escalation',
  })
  ruleName: string;

  @ApiProperty({
    description: 'Number of times the rule has been executed',
    example: 500,
  })
  executionCount: number;

  @ApiProperty({
    description: 'Success rate of the rule (0-100%)',
    example: 95.5,
  })
  successRate: number;

  @ApiProperty({
    description: 'Average duration of rule execution in milliseconds',
    example: 250,
  })
  avgDuration: number;
}
