import { GoalScope, GoalType, GoalPeriod, GoalUnit, GoalStatus } from '@verichron/enums';

export interface GoalUpdatedPayload {
  goalId: string;
  organizationId: string;
  scope?: GoalScope;
  type?: GoalType;
  period?: GoalPeriod;
  targetValue?: number;
  unit?: GoalUnit;
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  updatedBy: string;
}
