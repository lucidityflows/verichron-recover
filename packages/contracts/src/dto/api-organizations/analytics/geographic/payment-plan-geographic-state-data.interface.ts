import { IBaseGeographicStateData } from './base-geographic-state-data.interface';

export interface IPaymentPlanGeographicStateData extends IBaseGeographicStateData {
  activePaymentPlanCount: number;
  activePaymentPlanDebtValue: number;
  averageMonthlyPayment: number;
  completedPaymentPlanCount: number;
  completedPaymentPlanTotalRecovered: number;
  averageCompletionTimeMonths: number;
  paymentPlanSuccessRate: number;
  averageComplianceRate: number;
}
