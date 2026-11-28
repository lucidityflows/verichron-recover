import { ApiProperty } from '@nestjs/swagger';
import {
  WSRealtimeBasePayload,
  WSUserStatusChangedPayload,
  WSTeamMemberAddedPayload,
  WSDebtStatusChangedPayload,
  WSPaymentReceivedPayload,
  WSWorkItemAssignedPayload,
  WSComplianceBlockedPayload,
  WSSettlementRequestedPayload,
  NotificationCreatedPayload,
} from '@verichron/events';

export enum WSEventType {
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  TEAM_MEMBER_ADDED = 'TEAM_MEMBER_ADDED',
  DEBT_STATUS_CHANGED = 'DEBT_STATUS_CHANGED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  WORK_ITEM_ASSIGNED = 'WORK_ITEM_ASSIGNED',
  COMPLIANCE_BLOCKED = 'COMPLIANCE_BLOCKED',
  SETTLEMENT_REQUESTED = 'SETTLEMENT_REQUESTED',
  GOAL_PROGRESS_UPDATED = 'GOAL_PROGRESS_UPDATED',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
}

export class WSRealtimeBaseDto implements WSRealtimeBasePayload {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;
}

export class WSUserStatusChangedDto extends WSRealtimeBaseDto implements WSUserStatusChangedPayload {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  status!: string;
}

export class WSTeamMemberAddedDto extends WSRealtimeBaseDto implements WSTeamMemberAddedPayload {
  @ApiProperty({ format: 'uuid' })
  teamId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;
}

export class WSDebtStatusChangedDto extends WSRealtimeBaseDto implements WSDebtStatusChangedPayload {
  @ApiProperty({ format: 'uuid' })
  debtId!: string;

  @ApiProperty()
  status!: string;
}

export class WSPaymentReceivedDto extends WSRealtimeBaseDto implements WSPaymentReceivedPayload {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ format: 'uuid' })
  debtorId!: string;
}

export class WSWorkItemAssignedDto extends WSRealtimeBaseDto implements WSWorkItemAssignedPayload {
  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ format: 'uuid' })
  collectorId!: string;

  @ApiProperty({ format: 'uuid' })
  debtorId!: string;
}

export class WSComplianceBlockedDto extends WSRealtimeBaseDto implements WSComplianceBlockedPayload {
  @ApiProperty({ format: 'uuid' })
  debtorId!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  timestamp!: string;
}

export class WSSettlementRequestedDto extends WSRealtimeBaseDto implements WSSettlementRequestedPayload {
  @ApiProperty({ format: 'uuid' })
  debtId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ format: 'uuid' })
  collectorId!: string;
}

export class WSGoalProgressUpdatedDto extends WSRealtimeBaseDto {
  @ApiProperty({ format: 'uuid' })
  goalId!: string;

  @ApiProperty()
  currentValue!: number;

  @ApiProperty()
  progressPercentage!: number;

  @ApiProperty()
  status!: string;
}

export class WSSystemNotificationDto extends WSRealtimeBaseDto implements NotificationCreatedPayload {
  @ApiProperty({
    description: 'Unique notification ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  notificationId!: string;

  @ApiProperty({
    description: 'User ID intended for this notification',
    format: 'uuid',
    example: '987fcdeb-51a2-43d7-9876-543210987654',
  })
  userId!: string;

  @ApiProperty({
    description: 'Notification Type (e.g. HIGH_PRIORITY_ITEM)',
    example: 'HIGH_PRIORITY_ITEM',
  })
  type!: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Verichron Setup Required',
  })
  title!: string;

  @ApiProperty({
    description: 'Notification message body',
    example: 'Welcome to your new workspace. Please complete the initial portfolio import.',
  })
  message!: string;

  @ApiProperty({
    description: 'Optional action link for navigation',
    required: false,
    example: '/inventory/ingestion',
  })
  actionLink?: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    example: { isSystemWelcome: true },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'When the notification was created',
    example: '2025-10-24T10:00:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Helper DTO to expose WSEventType enum to OpenAPI/Swagger
 */
export class WSEventTypeDto {
  @ApiProperty({ enum: WSEventType, enumName: 'WSEventType' })
  eventType!: WSEventType;
}