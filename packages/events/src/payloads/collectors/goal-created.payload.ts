import { GoalScope, GoalType, GoalPeriod, GoalUnit, GoalStatus } from '@verichron/enums';

export interface GoalCreatedPayload {
  goalId: string;
  organizationId: string;
  scope: GoalScope;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  unit: GoalUnit;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  teamId?: string;
  collectorUserId?: string;
  createdBy: string;
}
