import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IOwnershipHistoryResponse,
  IDebtOwnershipChain,
  IQueryHistory,
} from '@verichron/contracts';
import { SortOrder } from '@verichron/enums';
import { DebtOwnershipHistory } from '../entities/debt-ownership-history.entity';
import { IsOptional, IsEnum } from 'class-validator';

/**
 * DTO for querying ownership history.
 */
export class QueryHistoryDto implements IQueryHistory {
  @ApiPropertyOptional({
    description: 'Sort order for history records (ASC = oldest first, DESC = newest first)',
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.ASC,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'order must be ASC or DESC' })
  order?: SortOrder = SortOrder.ASC;
}

/**
 * DTO for ownership history record response.
 *
 * Represents a single period of ownership for a debt.
 */
export class OwnershipHistoryResponseDto implements IOwnershipHistoryResponse {
  @ApiProperty({
    description: 'Unique history record identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8',
  })
  id: string;

  @ApiProperty({
    description: 'Debt ID this record belongs to',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  debtId: string;

  @ApiProperty({
    description: 'Organization that owned the debt',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Date when organization acquired the debt',
    example: '2024-01-15',
    format: 'date',
  })
  acquiredDate: string;

  @ApiProperty({
    description: 'Date when organization sold the debt (null if current owner)',
    example: '2024-06-15',
    format: 'date',
    nullable: true,
  })
  soldDate: string | null;

  @ApiProperty({
    description: 'Source of acquisition',
    example: 'Initial Import from First National Bank',
  })
  source: string;

  @ApiProperty({
    description: 'Number of days owned (null if still owned)',
    example: 152,
    nullable: true,
  })
  daysOwned: number | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: string;

  /**
   * Factory method to create DTO from entity.
   */
  static fromEntity(history: DebtOwnershipHistory): OwnershipHistoryResponseDto {
    const dto = new OwnershipHistoryResponseDto();
    dto.id = history.id;
    dto.debtId = history.debtId;
    dto.organizationId = history.organizationId;
    dto.acquiredDate = history.acquiredDate.toISOString().split('T')[0];
    dto.soldDate = history.soldDate
      ? history.soldDate.toISOString().split('T')[0]
      : null;
    dto.source = history.source;

    // Calculate days owned
    if (history.soldDate) {
      const acquired = history.acquiredDate.getTime();
      const sold = history.soldDate.getTime();
      dto.daysOwned = Math.floor((sold - acquired) / (1000 * 60 * 60 * 24));
    } else {
      dto.daysOwned = null;
    }

    dto.createdAt = history.createdAt.toISOString();
    return dto;
  }
}

/**
 * DTO for complete debt ownership chain response.
 *
 * Provides the full chain of title for a debt.
 */
export class DebtOwnershipChainResponseDto implements IDebtOwnershipChain {
  @ApiProperty({
    description: 'Debt ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  debtId: string;

  @ApiProperty({
    description: 'Complete ownership history in chronological order',
    type: [OwnershipHistoryResponseDto],
  })
  history: IOwnershipHistoryResponse[];

  @ApiProperty({
    description: 'Total number of ownership transfers',
    example: 2,
  })
  totalTransfers: number;

  @ApiProperty({
    description: 'Current owner organization ID (null if no records)',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    nullable: true,
  })
  currentOwnerId: string | null;
}
