import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';

export interface ICreateGoal {
  scope: GoalScope;
  teamId?: string;
  collectorUserId?: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  unit: GoalUnit;
  name: string;
  description?: string;
  startDate: string | Date; // DTOs often accept string dates from JSON
  endDate?: string | Date;
}

export interface IUpdateGoal extends Partial<ICreateGoal> {
  isActive?: boolean;
  isArchived?: boolean;
}

export interface IGoalProgressResponse {
  goalId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  // Status might be calculated on the fly or stored
  status?: string; 
  lastUpdated: Date;
}
