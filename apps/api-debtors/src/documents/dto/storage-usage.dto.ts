import { ApiProperty } from '@nestjs/swagger';

export class StorageUsageDto {
  @ApiProperty({
    description: 'Total storage used in bytes',
    example: 5242880,
  })
  bytes: number;

  @ApiProperty({
    description: 'Total storage used in megabytes (rounded to 2 decimal places)',
    example: 5.0,
  })
  megabytes: number;
}
