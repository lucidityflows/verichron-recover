import { ApiProperty } from '@nestjs/swagger';
import { CreditorResponseDto } from './creditor-response.dto';

export class PaginatedCreditorResponseDto {
  @ApiProperty({ type: [CreditorResponseDto] })
  creditors: CreditorResponseDto[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;
}
