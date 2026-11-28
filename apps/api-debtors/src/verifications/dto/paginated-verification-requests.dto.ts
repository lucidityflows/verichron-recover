import { ApiProperty } from '@nestjs/swagger';
import { VerificationRequest } from '../entities/verification.entity';

export class PaginatedVerificationRequestsDto {
  @ApiProperty({
    type: () => [VerificationRequest],
    description: 'Array of verification requests for the current page',
  })
  data: VerificationRequest[];

  @ApiProperty({
    type: Number,
    description: 'Total number of verification requests available',
    example: 25,
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
  pageSize: number; // Keep 'pageSize' here for now, as the DTO for QueryVerificationRequestsDto also uses 'pageSize'
}
