import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * Standardized paginated response wrapper for list endpoints
 */
@Exclude()
export class PaginatedResponseDto<T> {
  @Expose()
  @ApiProperty({
    description: 'Array of items for the current page',
  })
  data!: T[];

  @Expose()
  @ApiProperty({
    description: 'page response metadata',
    example: {
      total: 100,
      page: 1,
      pageSize: 10,
      totalPages: 10,
      hasPreviousPage: false

    }
  })
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
