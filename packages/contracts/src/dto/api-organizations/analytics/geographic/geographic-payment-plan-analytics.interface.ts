import { IPaymentPlanGeographicStateData } from './payment-plan-geographic-state-data.interface';

export interface IGeographicPaymentPlanAnalytics {
  type: 'payment-plans';
  totalDebtorsWithPlans: number;
  activePlans: number;
  completedPlans: number;
  totalPlans: number;
  states: IPaymentPlanGeographicStateData[];
}
