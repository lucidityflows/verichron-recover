import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActionType } from '@verichron/enums';

/**
 * DTO for listing collector actions (live activity feed)
 */
export class CollectorActionListItemDto {
  @ApiProperty({
    description: 'Action ID',
    example: 'action-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Action timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Collector user ID',
    example: 'collector-uuid-456',
  })
  collectorUserId: string;

  @ApiPropertyOptional({
    description: 'Collector name',
    example: 'John Smith',
  })
  collectorName?: string;

  @ApiProperty({
    description: 'Debtor profile ID',
    example: 'debtor-uuid-789',
  })
  debtorId: string;

  @ApiPropertyOptional({
    description: 'Debtor name',
    example: 'Jane Doe',
  })
  debtorName?: string;

  @ApiProperty({
    description: 'Type of action performed',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.CALL,
  })
  actionType: ActionType;

  @ApiPropertyOptional({
    description: 'Outcome of the action',
    example: 'contacted',
  })
  outcome?: string;

  @ApiPropertyOptional({
    description: 'Action description/notes',
    example: 'Called debtor regarding outstanding balance',
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (payment details, etc.)',
    example: { amount: 10000, paymentMethod: 'credit_card' },
  })
  metadata?: Record<string, any>;
}
