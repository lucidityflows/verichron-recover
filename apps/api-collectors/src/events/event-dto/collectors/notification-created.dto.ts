import { IsUUID, IsString, IsNotEmpty, IsOptional, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationCreatedPayload } from '@verichron/events';

export class NotificationCreatedDto implements NotificationCreatedPayload {
  @IsUUID()
  @IsNotEmpty()
  notificationId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  actionLink?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  createdAt: Date;
}
