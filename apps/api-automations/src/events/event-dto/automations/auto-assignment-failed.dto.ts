import { AutoAssignmentFailedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class AutoAssignmentFailedDto implements AutoAssignmentFailedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsString()
  @IsOptional()
  targetEntityId?: string;

  @IsString()
  @IsNotEmpty()
  error: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
