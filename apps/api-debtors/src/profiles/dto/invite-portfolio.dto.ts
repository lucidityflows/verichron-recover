import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for inviting all debtors in a portfolio
 */
export class InvitePortfolioDto {
  @ApiProperty({
    description: 'Portfolio ID to invite debtors from',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  portfolioId: string;
}
