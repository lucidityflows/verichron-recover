import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Base response DTO with common timestamp fields
 */
@Exclude()
export class BaseResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-10-18T10:30:00.000Z',
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-10-18T14:45:00.000Z',
  })
  updatedAt!: Date;
}
