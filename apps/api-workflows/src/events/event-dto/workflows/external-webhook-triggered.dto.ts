import { ExternalWebhookTriggeredPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsObject, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class ExternalWebhookTriggeredDto implements ExternalWebhookTriggeredPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  webhookUrl: string;

  @IsObject()
  payload: Record<string, any>;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'DEBT'])
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsOptional()
  @IsObject()
  response?: {
    status: number;
    body: any;
  };

  @IsOptional()
  @IsString()
  error?: string;
}
