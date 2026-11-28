import { ApiProperty } from '@nestjs/swagger';

export class DailyExecutionStatsDto {
  @ApiProperty({
    description: 'Date for the statistics (ISO format)',
    example: '2023-10-27',
  })
  date: string;

  @ApiProperty({
    description: 'Total executions on this date',
    example: 120,
  })
  executions: number;

  @ApiProperty({
    description: 'Number of successful executions on this date',
    example: 115,
  })
  successes: number;

  @ApiProperty({
    description: 'Number of failed executions on this date',
    example: 5,
  })
  failures: number;
}
