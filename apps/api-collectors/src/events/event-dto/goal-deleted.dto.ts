import { IsNotEmpty, IsUUID } from 'class-validator';
import { GoalDeletedPayload } from '@verichron/events';

export class GoalDeletedDto implements GoalDeletedPayload {
  @IsUUID()
  @IsNotEmpty()
  goalId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  deletedBy: string;
}
