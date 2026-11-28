import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponse<T> {
  @ApiProperty({ description: 'The total number of items available.' })
  total: number;

  @ApiProperty({ description: 'The current page number.' })
  page: number;

  @ApiProperty({ description: 'The number of items per page.' })
  pageSize: number;

  @ApiProperty({ isArray: true, description: 'The data for the current page.' })
  data: T[];
}
