import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { IDebtorActionResponse } from '@verichron/contracts';

/**
 * Response DTO after logging a debtor action
 */
export class DebtorActionResponseDto implements IDebtorActionResponse {
  @ApiProperty({
    description: 'Action ID',
    example: 'action-uuid-123',
  })
  actionId: string;

  @ApiProperty({
    description: 'Whether the action was logged successfully',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Success or error message',
    example: 'Action logged successfully',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Timeline event ID if created',
    example: 'timeline-event-uuid-456',
  })
  timelineEventId?: string;
}
