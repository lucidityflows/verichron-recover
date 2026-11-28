import { GoalScope, GoalType, GoalPeriod, GoalUnit, GoalStatus } from '@verichron/enums';

export interface IGoal {
  id: string;
  organizationId: string;
  scope: GoalScope;
  teamId?: string;
  collectorUserId?: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  unit: GoalUnit;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
