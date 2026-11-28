import { ApiProperty } from '@nestjs/swagger';
import { Document } from '../entities/document.entity';

export class PaginatedDocumentsDto {
  @ApiProperty({
    type: () => [Document],
    description: 'Array of documents for the current page',
  })
  data: Document[];

  @ApiProperty({
    type: Number,
    description: 'Total number of documents available',
    example: 15,
  })
  total: number;

  @ApiProperty({
    type: Number,
    description: 'The current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    type: Number,
    description: 'The number of items per page',
    example: 20,
  })
  pageSize: number;
}
