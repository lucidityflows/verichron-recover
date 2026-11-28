import { SendEmailCommandPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsObject, IsOptional } from 'class-validator';

export class SendEmailCommandDto implements SendEmailCommandPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsObject()
  context: Record<string, any>;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsString()
  @IsOptional()
  correlationId?: string;
}
