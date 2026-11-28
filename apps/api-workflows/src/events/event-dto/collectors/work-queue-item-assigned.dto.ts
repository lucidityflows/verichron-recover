import { WorkQueueItemAssignedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsEnum } from 'class-validator';

export class WorkQueueItemAssignedDto implements WorkQueueItemAssignedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  collectorId: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'ACCOUNT'])
  targetEntityType: 'DEBTOR' | 'ACCOUNT';

  @IsString()
  @IsNotEmpty()
  assignedBy: string;

  @IsString()
  @IsNotEmpty()
  assignmentReason: string;
}
