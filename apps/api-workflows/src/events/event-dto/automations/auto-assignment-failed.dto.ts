import { AutoAssignmentFailedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class AutoAssignmentFailedDto implements AutoAssignmentFailedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsOptional()
  @IsString()
  targetEntityId?: string;

  @IsString()
  @IsNotEmpty()
  error: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
