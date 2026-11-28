import { SendNotificationCommandPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional } from 'class-validator';

export class SendNotificationCommandDto implements SendNotificationCommandPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['INFO', 'WARNING', 'ERROR', 'SUCCESS'])
  notificationType: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsString()
  @IsOptional()
  actionUrl?: string;
}
