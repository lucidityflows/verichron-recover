import { AddToQueuePayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';

export class AddToQueueDto implements AddToQueuePayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  queueId: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'DEBT'])
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsOptional()
  @IsNumber()
  priorityOverride?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
