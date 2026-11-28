import { ApiProperty } from '@nestjs/swagger';
import { DebtorProfileEntity } from '../entities/debtor-profile.entity';

export class PaginatedDebtorsDto {
  @ApiProperty({
    type: () => [DebtorProfileEntity],
    description: 'Array of debtor profiles for the current page',
  })
  data: DebtorProfileEntity[];

  @ApiProperty({
    type: Number,
    description: 'Total number of debtors available',
    example: 150,
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