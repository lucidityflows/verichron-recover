/**
 * Organization business rules settings interface
 */
export interface IOrganizationBusinessRulesSettings {
  minimumPaymentPlanPercentage?: number;
  maxPaymentPlanDurationMonths?: number;
  autoApprovePaymentPlansUnder?: number;
}
