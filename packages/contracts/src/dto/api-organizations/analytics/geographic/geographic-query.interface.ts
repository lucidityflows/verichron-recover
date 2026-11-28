import { PortfolioType, DebtAgeBucket } from "@verichron/enums";


export interface IGeographicQuery {
  states?: string[];
  portfolioId?: string;
  portfolioName?: string;
  portfolioType?: PortfolioType;
  debtAgeMin?: number;
  debtAgeMax?: number;
  debtAgeBucket?: DebtAgeBucket;
  hasPaymentPlan?: boolean;
  isResponsive?: boolean;
  likelihoodToPayMin?: number;
  defaultRiskMax?: number;
}
