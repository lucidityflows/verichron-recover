import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { DebtStatus } from '@verichron/enums';
import type {
  DebtCreatedPayload,
  DebtUpdatedPayload,
  DebtStatusChangedPayload,
  TransactionSucceededPayload,
  TransactionFailedPayload,
  UserCreatedPayload,
  UserStatusChangedPayload,
} from '@verichron/events';

export class DebtCreatedDto implements DebtCreatedPayload {
  @IsUUID()
  debtId!: string;

  @IsUUID()
  debtorProfileId!: string;

  @IsUUID()
  @IsOptional()
  debtorIdentityId?: string;

  @IsUUID()
  organizationId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsDateString()
  createdAt!: string;
}

export class DebtUpdatedDto implements DebtUpdatedPayload {
  @IsUUID()
  debtId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  portfolioId!: string;

  @IsUUID()
  updatedBy!: string;

  @IsDateString()
  updatedAt!: string;

  @IsString()
  @IsOptional()
  interestAmount?: string;

  @IsString()
  @IsOptional()
  feesAmount?: string;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsEnum(DebtStatus)
  @IsOptional()
  status?: DebtStatus;
}

export class DebtStatusChangedDto implements DebtStatusChangedPayload {
  @IsUUID()
  debtId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  portfolioId!: string;

  @IsEnum(DebtStatus)
  oldStatus!: DebtStatus;

  @IsEnum(DebtStatus)
  newStatus!: DebtStatus;

  @IsUUID()
  updatedBy!: string;

  @IsDateString()
  updatedAt!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class TransactionSucceededDto implements TransactionSucceededPayload {
  @IsUUID()
  transactionId!: string;

  @IsUUID()
  organizationId!: string;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  debtId!: string | null;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  paymentPlanId!: string | null;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  debtorId!: string | null;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  gatewayTransactionId!: string | null;

  @IsDateString()
  succeededAt!: string;
}

export class TransactionFailedDto implements TransactionFailedPayload {
  @IsUUID()
  transactionId!: string;

  @IsUUID()
  organizationId!: string;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  debtId!: string | null;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  paymentPlanId!: string | null;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  debtorId!: string | null;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  failureReason!: string | null;

  @IsDateString()
  failedAt!: string;
}

export class UserCreatedDto implements UserCreatedPayload {
  @IsUUID()
  userId!: string;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  organizationId!: string | null;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  invitationToken!: string;

  @IsDateString()
  invitationExpiresAt!: string;

  @IsUUID()
  roleId!: string;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  createdBy!: string | null;
}

export class UserStatusChangedDto implements UserStatusChangedPayload {
  @IsUUID()
  userId!: string;

  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  organizationId!: string | null;

  @IsString()
  @IsNotEmpty()
  oldStatus!: string;

  @IsString()
  @IsNotEmpty()
  newStatus!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  statusChangedAt!: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  changedBy?: string;
}
