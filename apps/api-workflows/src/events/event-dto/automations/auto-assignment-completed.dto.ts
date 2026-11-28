import { AutoAssignmentCompletedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class AutoAssignmentCompletedDto implements AutoAssignmentCompletedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
