import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ActionType, CallOutcome, PaymentMethod } from '@verichron/enums';
import type {
  ILogDebtorAction,
  IScheduledFollowUp,
  IPaymentDetails,
} from '@verichron/contracts';

/**
 * Scheduled follow-up DTO
 */
export class ScheduledFollowUpDto implements IScheduledFollowUp {
  @ApiProperty({
    description: 'Due date for follow-up action',
    example: '2024-12-15T10:00:00Z',
  })
  @IsDateString()
  dueDate: Date;

  @ApiProperty({
    description: 'Type of follow-up action',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.CALL,
  })
  @IsEnum(ActionType)
  actionType: ActionType;

  @ApiPropertyOptional({
    description: 'Notes for the follow-up',
    example: 'Follow up on payment promise',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Payment details DTO
 */
export class PaymentDetailsDto implements IPaymentDetails {
  @ApiProperty({
    description: 'Payment amount',
    example: 150.00,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.VISA,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'txn_abc123',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Confirmation number provided to debtor',
    example: 'CONF-2024-12345',
  })
  @IsString()
  @IsOptional()
  confirmationNumber?: string;

  @ApiProperty({
    description: 'Debt ID this payment applies to',
    example: 'debt-uuid-123',
  })
  @IsString()
  debtId: string;
}

/**
 * Log debtor action request DTO
 */
export class LogDebtorActionDto implements ILogDebtorAction {
  @ApiProperty({
    description: 'Type of action being logged',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.CALL,
  })
  @IsEnum(ActionType)
  actionType: ActionType;

  @ApiProperty({
    description: 'Action content/notes',
    example: 'Called debtor, discussed payment options',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Call outcome (for call actions)',
    enum: CallOutcome,
    enumName: 'CallOutcome',
    example: CallOutcome.SPOKE_TO_DEBTOR,
  })
  @IsEnum(CallOutcome)
  @IsOptional()
  outcome?: CallOutcome;

  @ApiPropertyOptional({
    description: 'Scheduled follow-up details',
    type: ScheduledFollowUpDto,
  })
  @ValidateNested()
  @Type(() => ScheduledFollowUpDto)
  @IsOptional()
  scheduledFollowUp?: ScheduledFollowUpDto;

  @ApiPropertyOptional({
    description: 'Payment details (for payment actions)',
    type: PaymentDetailsDto,
  })
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  @IsOptional()
  paymentDetails?: PaymentDetailsDto;

  @ApiPropertyOptional({
    description: 'Debt IDs related to this action',
    type: [String],
    example: ['debt-uuid-1', 'debt-uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  debtIds?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { callDuration: 300, recordingUrl: 'https://...' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
