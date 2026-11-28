import { GoalStatus } from '@verichron/enums';

export interface GoalProgressUpdatedPayload {
  goalId: string;
  organizationId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  status: GoalStatus;
  lastUpdated: Date;
}
