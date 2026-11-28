import { ApiProperty } from '@nestjs/swagger';
import { IDebtorFocusTimelineEvent } from '@verichron/contracts'; // Only import interface from contracts
import { TimelineEventType } from '@verichron/enums'; // Import enum from enums

export class DebtorFocusTimelineEventDto implements IDebtorFocusTimelineEvent {
  @ApiProperty({ description: "Unique identifier for the timeline event", example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: "Timestamp of when the event occurred", example: '2023-11-20T14:30:00.000Z' })
  timestamp: Date;

  @ApiProperty({
    description: "Type of event",
    enum: TimelineEventType,
    enumName: 'TimelineEventType',
    example: TimelineEventType.CONTACT_ATTEMPT,
  })
  eventType: TimelineEventType;

  @ApiProperty({ description: "Short summary or title of the event", example: 'Call Attempted' })
  title: string;

  @ApiProperty({ description: "Detailed description of the event", example: 'Called debtor, left voicemail regarding overdue payment.' })
  description: string;

  @ApiProperty({ description: "ID of the user who performed the action or 'SYSTEM'", example: 'user-123' })
  performedBy: string;

  @ApiProperty({ description: "Name of the user who performed the action or 'SYSTEM'", example: 'John Doe' })
  performedByName: string;

  @ApiProperty({ description: "Optional: ID of the debt related to this event", example: 'debt-456', nullable: true })
  relatedDebtId: string | null;
  
  @ApiProperty({
    description: "Additional metadata related to the event",
    example: { duration: '5m', outcome: 'Left Voicemail' }
  })
  metadata: Record<string, any>;
}
